// controllers/buyerController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Buyer from '../models/Buyer.js';
import { calculateRealTrustScore } from '../services/trustScoreService.js';
import { matchBuyers } from '../services/matchingService.js';
import { explainBuyerMatch } from '../services/geminiService.js';

// GET /api/buyers?crop=Tomato&buyerType=Processor&channel=Exporter
// buyerType/channel filters power Feature 4 (Institutional Buyer Integration) —
// the frontend can ask for just processors, retail chains, exporters, or
// government procurement agencies.
export const listBuyers = asyncHandler(async (req, res) => {
  const { crop, buyerType, channel, name } = req.query;
  const query = {};
  if (crop) query.cropRequired = crop;
  if (buyerType) query.buyerType = buyerType;
  if (channel) query.channel = channel;
  if (name) query.name = name;

  const buyers = await Buyer.find(query).lean();
  const withTrust = await Promise.all(buyers.map(async (b) => ({ ...b, trust: await calculateRealTrustScore(b) })));
  res.json({ success: true, buyers: withTrust });
});

// POST /api/buyers  — lets a buyer post a new procurement requirement.
// Reuses the existing Buyer model/schema exactly as-is (Feature 4); this
// is the same document shape already used for seeded demo buyers, just
// created live from the Buyer dashboard instead of via the seed script.
export const createBuyerRequirement = asyncHandler(async (req, res) => {
  const {
    name, buyerType, channel, cropRequired, gradeRequired, quantityRequiredTonnes,
    offerPricePerKg, location, distanceKm, requiredByDate, requirements,
    deliveryLocation, budgetPerKg,
  } = req.body;

  if (!name || !cropRequired || !quantityRequiredTonnes || !offerPricePerKg) {
    return res.status(400).json({ success: false, message: 'name, cropRequired, quantityRequiredTonnes and offerPricePerKg are required' });
  }

  const buyer = await Buyer.create({
    name, buyerType, channel, cropRequired, gradeRequired, quantityRequiredTonnes,
    offerPricePerKg, location, distanceKm, requiredByDate, requirements,
    deliveryLocation, budgetPerKg,
    verified: true, paymentReliabilityPct: 80, completedTransactions: 0, disputedTransactionsPct: 0,
    isDemoData: true,
  });

  res.status(201).json({ success: true, buyer });
});

// POST /api/buyers/match  { crop, quantityTonnes, grade }
export const matchBuyersHandler = asyncHandler(async (req, res) => {
  const { crop, quantityTonnes, grade } = req.body;
  if (!crop || !quantityTonnes) {
    return res.status(400).json({ success: false, message: 'crop and quantityTonnes are required' });
  }

  const buyers = await Buyer.find({ cropRequired: crop }).lean();
  if (!buyers.length) {
    return res.json({ success: true, matches: [], message: 'No buyers currently seeking this crop.' });
  }

  const withTrust = await Promise.all(buyers.map(async (b) => ({ ...b, trustScore: (await calculateRealTrustScore(b)).score })));
  const maxOfferPrice = Math.max(...withTrust.map((b) => b.offerPricePerKg));

  const ranked = matchBuyers({ crop, quantityTonnes, grade }, withTrust, maxOfferPrice);
  const top3 = ranked.slice(0, 3);

  const aiExplanation = await explainBuyerMatch({
    farmerLot: { crop, quantityTonnes, grade },
    rankedBuyers: top3.map((r) => ({ name: r.buyer.name, matchPercent: r.matchPercent, offerPricePerKg: r.buyer.offerPricePerKg })),
  });

  res.json({ success: true, matches: ranked, aiExplanation });
});