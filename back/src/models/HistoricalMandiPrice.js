// models/HistoricalMandiPrice.js — Feature: Historical Market Data.
//
// Bound to the SECOND connection (MONGO_URI2, see
// config/historicalDb.js) — never the default mongoose connection, so
// this model is never accidentally queried against (or migrated into)
// the primary application database.
//
// This collection is pre-existing data this app does not write —
// `strict: false` deliberately does NOT lock the schema down, because
// we don't control the exact field names/casing the historical dataset
// was loaded with (mirrors the same "don't assume a rigid shape from an
// external data source" approach already used for the live data.gov.in
// feed in services/marketDataService.js, which reads both `market` and
// `Market`, `min_price` and `Min_Price`, etc.). All real field-name
// normalization happens in services/historicalMarketService.js.
import mongoose from 'mongoose';
import { getHistoricalConnection } from '../config/historicalDb.js';

// Configurable because we don't control how this pre-existing database
// named its collection — override with HISTORICAL_COLLECTION_NAME in
// .env if it differs from this default.
const COLLECTION_NAME = process.env.HISTORICAL_COLLECTION_NAME || 'mandi_prices';

const historicalMandiPriceSchema = new mongoose.Schema({}, { strict: false, collection: COLLECTION_NAME });

let cachedModel = null;

/**
 * Lazily compiles the model against the (async-initialized) MONGO_URI2
 * connection the first time it's needed, and reuses it after that.
 * @returns {Promise<import('mongoose').Model|null>} null if MONGO_URI2
 *   isn't configured or unreachable — callers must handle that.
 */
export async function getHistoricalMandiPriceModel() {
  if (cachedModel) return cachedModel;

  const conn = await getHistoricalConnection();
  if (!conn) return null;

  // Guard against "OverwriteModelError" if this is ever called twice
  // before cachedModel is set (e.g. two concurrent requests during
  // startup).
  cachedModel = conn.models.HistoricalMandiPrice
    || conn.model('HistoricalMandiPrice', historicalMandiPriceSchema);

  return cachedModel;
}