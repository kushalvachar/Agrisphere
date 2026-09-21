// models/TrackedMarketQuery.js — Phase 2: Market Intelligence Engine.
//
// Every time a real live market-price fetch is made for a given
// {crop, state, district} combination (a farmer opening Market
// Intelligence, a buyer checking a commodity, the recommendation
// engine running), that combination is upserted here. The background
// history scheduler (services/historyScheduler.js) then re-polls every
// tracked combination once a day so PriceHistory keeps accumulating
// real data even when nobody is actively looking at the page —
// this is what lets the 30-day trend graph fill in over real time
// without ever needing seed/mock rows.
import mongoose from 'mongoose';

const trackedMarketQuerySchema = new mongoose.Schema({
  crop: { type: String, required: true },
  state: { type: String, default: '' },
  district: { type: String, default: '' },
  firstSeenAt: { type: Date, default: Date.now },
  lastPolledAt: { type: Date, default: null },
}, { timestamps: true });

trackedMarketQuerySchema.index({ crop: 1, state: 1, district: 1 }, { unique: true });

export default mongoose.model('TrackedMarketQuery', trackedMarketQuerySchema);
