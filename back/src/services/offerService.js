// services/offerService.js — Feature 3: Digital Offer & Negotiation System.
//
// Deterministic state-machine rules for an offer thread. Gemini is
// never involved in deciding whether a transition is valid — this file
// is the single source of truth for that. Gemini is only used
// separately (see geminiService.explainOfferNegotiation) to summarize
// a negotiation thread in plain language for the farmer.
import Offer from '../models/Offer.js';

const ALLOWED_TRANSITIONS = {
  PENDING: ['COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  COUNTERED: ['COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function assertTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(`Cannot move offer from ${currentStatus} to ${nextStatus}`);
    err.status = 400;
    throw err;
  }
}

/** Creates a fresh offer thread, seeded with the buyer's initial terms. */
export async function createOffer({ lotId, farmerName, buyerName, crop, grade, quantityTonnes, pricePerKg }) {
  const offer = await Offer.create({
    lotId,
    farmerName,
    buyerName,
    crop,
    grade,
    quantityTonnes,
    initialPricePerKg: pricePerKg,
    currentPricePerKg: pricePerKg,
    currentQuantityTonnes: quantityTonnes,
    status: 'PENDING',
    negotiationHistory: [{ by: 'buyer', pricePerKg, quantityTonnes, note: 'Initial offer' }],
  });
  return offer;
}

/** Adds a counter-offer from either side and moves status to COUNTERED. */
export async function addCounterOffer(offerId, { by, pricePerKg, quantityTonnes, note }) {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    const err = new Error('Offer not found');
    err.status = 404;
    throw err;
  }
  assertTransitionAllowed(offer.status, 'COUNTERED');

  offer.negotiationHistory.push({ by, pricePerKg, quantityTonnes, note });
  offer.currentPricePerKg = pricePerKg;
  offer.currentQuantityTonnes = quantityTonnes;
  offer.status = 'COUNTERED';
  await offer.save();
  return offer;
}

/** Accepts the offer at its current terms (whatever the last counter was). */
export async function resolveOffer(offerId, nextStatus) {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    const err = new Error('Offer not found');
    err.status = 404;
    throw err;
  }
  assertTransitionAllowed(offer.status, nextStatus);
  offer.status = nextStatus;
  await offer.save();
  return offer;
}