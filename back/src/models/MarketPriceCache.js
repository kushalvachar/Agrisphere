// models/MarketPriceCache.js
// MongoDB-backed cache for live Data.gov.in market price records.
// Pipeline: Live Data.gov API → MongoDB Cache → Historical Price Collection → Frontend
//
// Each document stores a single market+crop price snapshot fetched from
// the Data.gov.in AGMARKNET resource. A TTL index expires documents
// automatically so stale prices are never served forever. The price history
// collection (PriceHistory) is updated from these cached records by the
// marketCacheService whenever fresh data arrives.
import mongoose from 'mongoose';

const marketPriceCacheSchema = new mongoose.Schema({
  // --- Identity (what this price is for) ---
  market:        { type: String, required: true, index: true },
  crop:          { type: String, required: true, index: true },
  state:         { type: String, default: '' },
  district:      { type: String, default: '' },
  arrivalDate:   { type: Date, required: true },

  // --- Prices (₹/kg — already converted from ₹/quintal at ingest time) ---
  minPrice:      { type: Number, default: null },
  modalPrice:    { type: Number, required: true },
  maxPrice:      { type: Number, default: null },

  // --- Provenance ---
  source:        { type: String, default: 'AGMARKNET' },
  fetchedAt:     { type: Date, required: true, default: Date.now },
}, { timestamps: false });

// Compound unique index so we never double-insert the same market+crop+date.
marketPriceCacheSchema.index({ market: 1, crop: 1, arrivalDate: 1 }, { unique: true });

// TTL: auto-delete cache documents older than 7 days so the collection
// stays lean. Historical data is persisted separately in PriceHistory.
marketPriceCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('MarketPriceCache', marketPriceCacheSchema);