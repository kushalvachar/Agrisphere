// controllers/offerController.js — Feature 3: Digital Offer & Negotiation System
import { asyncHandler } from '../middleware/asyncHandler.js';
import Offer from '../models/Offer.js';
import { createOffer, addCounterOffer, resolveOffer } from '../services/offerService.js';
import { explainOfferNegotiation } from '../services/geminiService.js';

// POST /api/offers  { lotId?, farmerName, buyerName, crop, grade, quantityTonnes, pricePerKg }
export const createOfferHandler = asyncHandler(async (req, res) => {
  const { lotId, farmerName, buyerName, crop, grade, quantityTonnes, pricePerKg } = req.body;
  if (!farmerName || !buyerName || !crop || !quantityTonnes || !pricePerKg) {
    return res.status(400).json({ success: false, message: 'farmerName, buyerName, crop, quantityTonnes and pricePerKg are required' });
  }
  const offer = await createOffer({ lotId, farmerName, buyerName, crop, grade, quantityTonnes, pricePerKg });
  res.status(201).json({ success: true, offer });
});

// GET /api/offers?farmerName=&buyerName=&status=
export const listOffers = asyncHandler(async (req, res) => {
  const { farmerName, buyerName, status } = req.query;
  const query = {};
  if (farmerName) query.farmerName = farmerName;
  if (buyerName) query.buyerName = buyerName;
  if (status) query.status = status;

  const offers = await Offer.find(query).sort({ updatedAt: -1 }).lean();
  res.json({ success: true, offers });
});

// GET /api/offers/:id  (includes an AI-generated plain-language summary of the thread)
export const getOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id).lean();
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

  const aiSummary = await explainOfferNegotiation({
    crop: offer.crop,
    initialPricePerKg: offer.initialPricePerKg,
    currentPricePerKg: offer.currentPricePerKg,
    status: offer.status,
    negotiationHistory: offer.negotiationHistory,
  });

  res.json({ success: true, offer, aiSummary });
});

// POST /api/offers/:id/counter  { by: 'farmer'|'buyer', pricePerKg, quantityTonnes, note? }
export const counterOffer = asyncHandler(async (req, res) => {
  const { by, pricePerKg, quantityTonnes, note } = req.body;
  if (!by || !pricePerKg || !quantityTonnes) {
    return res.status(400).json({ success: false, message: 'by, pricePerKg and quantityTonnes are required' });
  }
  const offer = await addCounterOffer(req.params.id, { by, pricePerKg, quantityTonnes, note });
  res.json({ success: true, offer });
});

// PATCH /api/offers/:id/accept
export const acceptOffer = asyncHandler(async (req, res) => {
  const offer = await resolveOffer(req.params.id, 'ACCEPTED');
  res.json({ success: true, offer });
});

// PATCH /api/offers/:id/reject
export const rejectOffer = asyncHandler(async (req, res) => {
  const offer = await resolveOffer(req.params.id, 'REJECTED');
  res.json({ success: true, offer });
});

// PATCH /api/offers/:id/withdraw
export const withdrawOffer = asyncHandler(async (req, res) => {
  const offer = await resolveOffer(req.params.id, 'WITHDRAWN');
  res.json({ success: true, offer });
});