// models/Market.js — a mandi/exchange market and its current price snapshot for a crop.
//
// Feature 5 (Multi-Channel Market Comparison): `channel` marks whether
// this listing is a physical APMC mandi or an eNAM electronic-trading
// listing, so it can be ranked alongside Buyer channels (Processor,
// Exporter, Retail Chain, Digital Marketplace) in one comparison table.
import mongoose from 'mongoose';

const CHANNELS = ['APMC', 'eNAM'];

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true },        // e.g. "Kolar APMC"
  channel: { type: String, enum: CHANNELS, default: 'APMC' },
  state: String,
  district: String,
  crop: { type: String, required: true },
  distanceKm: Number,                             // distance from the demo farmer's location
  minPrice: Number,                                // ₹/kg
  modalPrice: Number,                              // ₹/kg — the "typical" price used for comparisons
  maxPrice: Number,                                // ₹/kg
  arrivalQuantityTonnes: Number,
  trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
  source: { type: String, enum: ['AGMARKNET', 'DEMO_SEED'], default: 'DEMO_SEED' },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

marketSchema.statics.CHANNELS = CHANNELS;

export default mongoose.model('Market', marketSchema);