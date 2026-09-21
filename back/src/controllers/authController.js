// controllers/authController.js — Phase 5: Buyer + FPO + Farmer Authentication.
import { asyncHandler } from '../middleware/asyncHandler.js';
import User from '../models/User.js';
import Farmer from '../models/Farmer.js';
import FPO from '../models/FPO.js';
import Buyer from '../models/Buyer.js';
import { hashPassword, comparePassword, signToken } from '../services/authService.js';
import { validateGstin } from '../services/gstinService.js';

// Mongoose documents expose `_id` (an ObjectId), and only add a virtual
// `id` string getter when NOT using .lean() — and even then, res.json()
// serializing a raw document doesn't reliably surface it. Every caller
// below must get a plain object with a real `id` string, or the
// frontend's `navigate(`/farmer/${user.profile.id}`)` silently becomes
// `/farmer/undefined`, which is exactly what caused the
// "Cast to ObjectId failed for value \"undefined\"" crash.
function toPublicProfile(profile) {
  if (!profile) return null;
  const obj = typeof profile.toObject === 'function' ? profile.toObject() : profile;
  return { ...obj, id: String(obj._id) };
}

function toPublicUser(user, profile) {
  return {
    id: String(user._id),
    role: user.role,
    email: user.email || null,
    phone: user.phone || null,
    profile: toPublicProfile(profile),
  };
}

// POST /api/auth/register/farmer  { name, phone, password, location }
// Spec: "Farmer: Simple onboarding" — no KYC, just enough to create a
// working account and a Farmer profile the rest of the app already
// knows how to use (Market Intelligence, recommendations, etc.).
export const registerFarmer = asyncHandler(async (req, res) => {
  const { name, phone, password, location } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'name, phone and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const existing = await User.findOne({ phone });
  if (existing) return res.status(409).json({ success: false, message: 'An account with this phone number already exists' });

  const farmer = await Farmer.create({ name, phone, location: location || {} });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ role: 'farmer', phone, passwordHash, profileModel: 'Farmer', profileId: farmer._id });
  farmer.userId = user._id;
  await farmer.save();

  const token = signToken({ sub: user._id, role: 'farmer' });
  res.status(201).json({ success: true, token, user: toPublicUser(user, farmer) });
});

// POST /api/auth/register/fpo  { organizationName, registrationNumber, contactPerson, phone, email, password, location, memberCount }
// Spec: "FPO: Registration details, verification workflow" — account is
// created immediately (so the FPO can start using the platform) but
// verificationStatus starts 'pending'; see FPO.js for the review endpoint.
export const registerFPO = asyncHandler(async (req, res) => {
  const { organizationName, registrationNumber, contactPerson, phone, email, password, location, memberCount } = req.body;
  if (!organizationName || !registrationNumber || !contactPerson || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'organizationName, registrationNumber, contactPerson, phone, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists' });

  const fpo = await FPO.create({ organizationName, registrationNumber, contactPerson, phone, email, location: location || {}, memberCount });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ role: 'fpo', email: email.toLowerCase(), passwordHash, profileModel: 'FPO', profileId: fpo._id });

  const token = signToken({ sub: user._id, role: 'fpo' });
  res.status(201).json({ success: true, token, user: toPublicUser(user, fpo) });
});

// POST /api/auth/register/buyer  { companyName, gstin, contactPerson, phone, email, password, businessType, location }
// Spec: "Buyer KYC: Mandatory — GSTIN verification, Business details,
// Contact details, Verification status." GSTIN goes through the real
// structural/checksum validation in gstinService.js — a malformed GSTIN
// is rejected outright (never silently accepted); a well-formed one
// still starts 'pending' for human/document review, since a live
// GSTN registry lookup needs a paid GSP integration (see that file).
export const registerBuyer = asyncHandler(async (req, res) => {
  const { companyName, gstin, contactPerson, phone, email, password, businessType, location } = req.body;
  if (!companyName || !gstin || !contactPerson || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'companyName, gstin, contactPerson, phone, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const gstinCheck = validateGstin(gstin);
  if (!gstinCheck.valid) {
    return res.status(400).json({ success: false, message: `GSTIN verification failed: ${gstinCheck.reason}` });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists' });

  const buyer = await Buyer.create({
    name: companyName,
    gstin: gstin.trim().toUpperCase(),
    gstinValid: true,
    businessDetails: { businessName: companyName, businessType, contactPerson, email: email.toLowerCase() },
    verificationStatus: 'pending',
    location: [location?.district, location?.state].filter(Boolean).join(', '),
    isDemoData: false,
  });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ role: 'buyer', email: email.toLowerCase(), passwordHash, profileModel: 'Buyer', profileId: buyer._id });
  buyer.userId = user._id;
  await buyer.save();

  const token = signToken({ sub: user._id, role: 'buyer' });
  res.status(201).json({ success: true, token, user: toPublicUser(user, buyer) });
});

// POST /api/auth/login  { identifier, password }  — identifier is a
// phone (farmer) or email (fpo/buyer); either works so the frontend
// doesn't need to know which field a given role uses.
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'identifier and password are required' });

  const user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier.toLowerCase() }] });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const Model = { Farmer, FPO, Buyer }[user.profileModel];
  const profile = await Model.findById(user.profileId).lean();

  const token = signToken({ sub: user._id, role: user.role });
  res.json({ success: true, token, user: toPublicUser(user, profile) });
});

// GET /api/auth/me  (protected)
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const Model = { Farmer, FPO, Buyer }[user.profileModel];
  const profile = await Model.findById(user.profileId).lean();
  res.json({ success: true, user: toPublicUser(user, profile) });
});

// PATCH /api/auth/fpo/:id/verify  { status: 'verified'|'rejected', note }
// Placeholder verification workflow — see FPO.js comment. Open/
// unauthenticated for now because no admin role exists yet in this
// codebase; a real deployment would gate this behind one.
export const reviewFpo = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'status must be verified or rejected' });
  const fpo = await FPO.findByIdAndUpdate(req.params.id, { verificationStatus: status, verificationNote: note || '' }, { new: true });
  if (!fpo) return res.status(404).json({ success: false, message: 'FPO not found' });
  res.json({ success: true, fpo });
});

// PATCH /api/auth/buyer/:id/verify  { status: 'verified'|'rejected', note }
export const reviewBuyer = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'status must be verified or rejected' });
  const buyer = await Buyer.findByIdAndUpdate(req.params.id, { verificationStatus: status, verificationNote: note || '' }, { new: true });
  if (!buyer) return res.status(404).json({ success: false, message: 'Buyer not found' });
  res.json({ success: true, buyer });
});
