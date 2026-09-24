// controllers/lotController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Lot from '../models/Lot.js';
import Buyer from '../models/Buyer.js';
import User from '../models/User.js';
import FPO from '../models/FPO.js';
import { verifyToken } from '../services/authService.js';
import { matchLotsToBuyerRequirement } from '../services/matchingService.js';

// If the request carries a valid FPO login token, returns that FPO's id + name
// (the trusted source). Returns null otherwise (e.g. the un-logged-in /demo flow).
async function resolveOwningFpo(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || decoded.role !== 'fpo') return null;

  const user = await User.findById(decoded.sub).lean();
  if (!user || user.profileModel !== 'FPO') return null;

  const fpo = await FPO.findById(user.profileId).lean();
  return fpo ? { fpoId: fpo._id, fpoName: fpo.organizationName } : null;
}

// POST /api/lots  { crop, grade, contributions: [{farmerName, quantityTonnes}], fpoName? }
// The owning FPO is taken from the logged-in FPO's token when present, so buyers
// see the real FPO name on the lot. `fpoName` in the body is only a fallback.
export const createLot = asyncHandler(async (req, res) => {
  const { crop, grade, contributions, fpoName } = req.body;
  if (!crop || !Array.isArray(contributions) || !contributions.length) {
    return res.status(400).json({ success: false, message: 'crop and contributions[] are required' });
  }

  const owner = await resolveOwningFpo(req);
  const lot = await Lot.create({
    crop,
    grade,
    contributions,
    status: 'FORMING',
    fpoId: owner?.fpoId,
    fpoName: owner?.fpoName || (typeof fpoName === 'string' && fpoName.trim() ? fpoName.trim() : undefined),
  });
  res.status(201).json({ success: true, lot });
});

// GET /api/lots?crop=Tomato — list Smart Lots (used by the Buyer "Find
// Produce" page and the FPO dashboard overview; added so buyers can
// discover lots the same way farmers already discover buyers).
export const listLots = asyncHandler(async (req, res) => {
  const { crop, status } = req.query;
  const query = {};
  if (crop) query.crop = crop;
  if (status) query.status = status;

  const lots = await Lot.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, lots });
});

// GET /api/lots/:id
export const getLot = asyncHandler(async (req, res) => {
  const lot = await Lot.findById(req.params.id).lean();
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' });

  // Show compatible buyer demand for this lot's crop, to demonstrate the
  // "fragmented quantities -> buyer-ready lot" story (spec section 11).
  const compatibleBuyers = await Buyer.find({
    cropRequired: lot.crop,
    quantityRequiredTonnes: { $lte: lot.totalQuantityTonnes },
  }).lean();

  res.json({ success: true, lot, compatibleBuyers });
});

// POST /api/lots/match  { crop, quantityRequiredTonnes, gradeRequired }
// Buyer-side counterpart to POST /api/buyers/match — ranks existing
// Smart Lots against a buyer's posted requirement using the same
// deterministic crop/quantity/grade compatibility approach (see
// services/matchingService.js: matchLotsToBuyerRequirement).
export const matchLotsForBuyer = asyncHandler(async (req, res) => {
  const { crop, quantityRequiredTonnes, gradeRequired } = req.body;
  if (!crop) {
    return res.status(400).json({ success: false, message: 'crop is required' });
  }

  const lots = await Lot.find({ crop }).lean();
  if (!lots.length) {
    return res.json({ success: true, matches: [], message: 'No Smart Lots currently available for this crop.' });
  }

  const ranked = matchLotsToBuyerRequirement({ crop, quantityRequiredTonnes, gradeRequired }, lots);
  res.json({ success: true, matches: ranked });
});