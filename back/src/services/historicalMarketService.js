// services/historicalMarketService.js — Feature: Historical Market Data
// & Price Trend Charts.
//
// Reads the pre-existing historical mandi price collection on the
// SECOND database (MONGO_URI2 — see config/historicalDb.js,
// models/HistoricalMandiPrice.js) and turns it into the last-7-days
// trend shape the frontend chart needs, one entry per market:
//
//   { marketName, commodity, currentPrice, trend: [{ date, price }, …] }
//
// This is deliberately a SEPARATE pipeline from services/
// priceTrendService.js (which reads PriceHistory on the PRIMARY app DB
// — daily snapshots this app has been collecting itself since Phase 2).
// The two are complementary, not a replacement for one another:
//   - priceTrendService  -> live-collected history, primary DB, 7/15/30-day windows
//   - historicalMarketService -> pre-loaded historical dataset, MONGO_URI2, fixed 7-day window
// Both can be empty independently without affecting the other.
//
// Reliability: NEVER throws. A misconfigured/unreachable MONGO_URI2, an
// empty collection, or fewer than 7 days of data for a crop all result
// in a best-effort (possibly empty) result — Market Intelligence must
// keep working even if this dataset isn't available.
import { getHistoricalMandiPriceModel } from '../models/HistoricalMandiPrice.js';

const CACHE_TTL_MS = Number(process.env.HISTORICAL_CACHE_TTL_MS) || 15 * 60 * 1000; // 15 min
const cache = new Map(); // cacheKey -> { data, cachedAt }

function cacheKey({ crop, market, days }) {
  return `${(crop || '').toLowerCase()}::${(market || '').toLowerCase()}::${days}`;
}

// Same defensive field-name picking approach as marketDataService.js —
// we don't control how the pre-existing MONGO_URI2 collection cased or
// named its fields, so try every reasonable variant rather than assume one.
function pick(doc, keys) {
  for (const k of keys) {
    if (doc?.[k] !== undefined && doc[k] !== null && doc[k] !== '') return doc[k];
  }
  return undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Handle dd/mm/yyyy (AGMARKNET-style) as well as ISO strings.
  const parts = String(value).split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeDoc(doc) {
  const marketName = pick(doc, ['marketName', 'market', 'Market', 'market_name']);
  const commodity = pick(doc, ['commodity', 'Commodity', 'crop', 'Crop']);
  const date = toDate(pick(doc, ['date', 'Date', 'arrival_date', 'Arrival_Date', 'arrivalDate']));
  const modalPrice = toNumber(pick(doc, ['modalPrice', 'modal_price', 'Modal_Price']));
  const minPrice = toNumber(pick(doc, ['minPrice', 'min_price', 'Min_Price']));
  const maxPrice = toNumber(pick(doc, ['maxPrice', 'max_price', 'Max_Price']));
  // Task 4 (Advanced Seed Data): arrival volume is present on the newly
  // seeded dataset (seed/seedHistoricalMandi.js) but is optional here —
  // an older/externally-loaded collection without this field still
  // works fine, it just won't have an arrivalVolume on its trend points.
  const arrivalVolume = toNumber(pick(doc, ['arrivalVolume', 'arrival_volume', 'Arrival_Volume', 'arrivalQuantityTonnes']));
  const state = pick(doc, ['state', 'State']) || '';
  const district = pick(doc, ['district', 'District']) || '';

  if (!marketName || !commodity || !date || modalPrice == null) return null; // can't use this row
  return { marketName, commodity, date, modalPrice, minPrice, maxPrice, arrivalVolume, state, district };
}

/**
 * @param {Object} params - { crop, market?, days? } — market is optional
 *   (omit to get every market reporting this commodity).
 * @returns {Promise<{ available: boolean, days: number, markets: Array }>}
 *   `markets` is an array of { marketName, commodity, currentPrice, trend: [{date, price}] },
 *   one entry per market, sorted by trend date ascending within each.
 *   `available: false` (with an empty markets array) means MONGO_URI2
 *   isn't configured/reachable or has no matching rows — this is a
 *   normal, non-error outcome the frontend should render gracefully
 *   ("no historical data available yet"), never a crash.
 */
export async function getHistoricalTrend({ crop, market, days = 7 } = {}) {
  if (!crop) return { available: false, days, markets: [] };

  const key = cacheKey({ crop, market, days });
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let result;
  try {
    result = await fetchAndBuildTrend({ crop, market, days });
  } catch (err) {
    console.error('historicalMarketService: query failed —', err.message);
    result = { available: false, days, markets: [] };
  }

  // Cache both hits and graceful misses (short TTL either way) so a
  // burst of page loads for the same crop doesn't hammer MONGO_URI2.
  cache.set(key, { data: result, cachedAt: Date.now() });
  return result;
}

async function fetchAndBuildTrend({ crop, market, days }) {
  const Model = await getHistoricalMandiPriceModel();
  if (!Model) return { available: false, days, markets: [] }; // MONGO_URI2 not configured/reachable

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  // Filter loosely (case-insensitive) on whichever of the known
  // commodity/market field-name variants the document actually has —
  // matched precisely in JS below via normalizeDoc(), since a single
  // Mongo query can't cheaply OR across unknown field-name variants
  // AND be case-insensitive without a full collection scan anyway.
  // Overfetch a generous window (all rows in the last N days matching
  // the commodity in ANY of its likely field names) then narrow down.
  const commodityRegex = new RegExp(`^${escapeRegex(crop)}$`, 'i');
  const dateFieldCandidates = ['date', 'Date', 'arrival_date', 'Arrival_Date', 'arrivalDate'];
  const commodityFieldCandidates = ['commodity', 'Commodity', 'crop', 'Crop'];

  const or = [];
  for (const df of dateFieldCandidates) {
    for (const cf of commodityFieldCandidates) {
      or.push({ [df]: { $gte: since }, [cf]: commodityRegex });
    }
  }

  const rawDocs = await Model.find({ $or: or }).limit(5000).lean();

  const normalized = rawDocs
    .map(normalizeDoc)
    .filter((d) => d && d.date >= since && d.commodity.trim().toLowerCase() === crop.trim().toLowerCase());

  const filtered = market
    ? normalized.filter((d) => d.marketName.trim().toLowerCase() === market.trim().toLowerCase())
    : normalized;

  if (!filtered.length) return { available: false, days, markets: [] };

  // Group by market -> one row per calendar day (last one wins if the
  // source has duplicates for the same market+day), then sort by date.
  const byMarket = new Map();
  for (const row of filtered) {
    if (!byMarket.has(row.marketName)) byMarket.set(row.marketName, new Map());
    const dayKey = row.date.toISOString().slice(0, 10);
    byMarket.get(row.marketName).set(dayKey, row); // last write for that day wins
  }

  const markets = [...byMarket.entries()].map(([marketName, dayMap]) => {
    const rows = [...dayMap.values()].sort((a, b) => a.date - b.date);
    const trend = rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), price: r.modalPrice, arrivalVolume: r.arrivalVolume ?? null }));
    const latest = rows[rows.length - 1];
    return {
      marketName,
      commodity: latest.commodity,
      currentPrice: latest.modalPrice,
      state: latest.state,
      district: latest.district,
      trend, // fewer than `days` entries is normal and expected — the frontend shows whatever exists, no crash
    };
  });

  markets.sort((a, b) => b.currentPrice - a.currentPrice);

  return { available: true, days, markets };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}