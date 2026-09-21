// models/Offer.js — Feature 3: Digital Offer & Negotiation System.
// One offer thread between a farmer/FPO lot and a buyer, with a
// negotiation history of counter-offers. Status transitions are
// validated deterministically in services/offerService.js.
import mongoose from 'mongoose';

const negotiationEntrySchema = new mongoose.Schema({
  by: { type: String, enum: ['farmer', 'buyer'], required: true },
  pricePerKg: { type: Number, required: true },
  quantityTonnes: { type: Number, required: true },
  note: String,
  at: { type: Date, default: Date.now },
}, { _id: false });

const STATUSES = ['PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

const offerSchema = new mongoose.Schema({
  lotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot' },
  farmerName: { type: String, required: true },
  buyerName: { type: String, required: true },
  crop: { type: String, required: true },
  grade: String,
  quantityTonnes: { type: Number, required: true },
  initialPricePerKg: { type: Number, required: true },
  currentPricePerKg: { type: Number, required: true },
  currentQuantityTonnes: { type: Number, required: true },
  status: { type: String, enum: STATUSES, default: 'PENDING' },
  negotiationHistory: [negotiationEntrySchema],
}, { timestamps: true });

offerSchema.statics.STATUSES = STATUSES;

export default mongoose.model('Offer', offerSchema);