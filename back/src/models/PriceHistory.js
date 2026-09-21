// models/PriceHistory.js — Phase 2: real, dynamically-collected daily
// modal-price history (per crop+market+day), used for the 7/15/30-day
// trend graph and the deterministic price-prediction signal.
//
// This is NO LONGER seed data. Rows are written by
// marketDataService.persistDailySnapshot() every time a LIVE fetch from
// data.gov.in succeeds — either because a user viewed that crop, or
// because the background history scheduler (services/historyScheduler.js)
// polled it. The unique index below makes that a safe upsert: at most
// one row per crop+market+calendar-day, so re-polling the same day never
// duplicates or fabricates extra points.
import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema({
  crop: { type: String, required: true },
  market: { type: String, required: true },
  state: String,
  district: String,
  date: { type: Date, required: true }, // normalized to 00:00 local calendar day
  minPrice: Number,
  modalPrice: { type: Number, required: true },
  maxPrice: Number,
  source: { type: String, enum: ['AGMARKNET'], default: 'AGMARKNET' },
}, { timestamps: true });

priceHistorySchema.index({ crop: 1, market: 1, date: 1 }, { unique: true });
// Supports "last 30 days across all markets for this crop" queries.
priceHistorySchema.index({ crop: 1, date: 1 });

export default mongoose.model('PriceHistory', priceHistorySchema);
