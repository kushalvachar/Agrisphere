// models/ArrivalVolume.js — Feature 1: Arrival Volume Intelligence.
// Daily arrival quantity (tonnes) reported at a market for a crop.
// Kept as its own collection (rather than folded into PriceHistory) so
// it can later be swapped for a live AGMARKNET arrivals feed on its own.
import mongoose from 'mongoose';

const arrivalVolumeSchema = new mongoose.Schema({
  crop: { type: String, required: true },
  market: { type: String, required: true },
  date: { type: Date, required: true },
  arrivalQuantityTonnes: { type: Number, required: true },
  source: { type: String, enum: ['AGMARKNET', 'DEMO_SEED'], default: 'DEMO_SEED' },
}, { timestamps: true });

arrivalVolumeSchema.index({ crop: 1, market: 1, date: 1 });

export default mongoose.model('ArrivalVolume', arrivalVolumeSchema);