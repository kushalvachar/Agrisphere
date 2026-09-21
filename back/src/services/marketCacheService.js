// services/marketCacheService.js
//
// LIVE-FIRST pipeline (fixed): always attempt the live Data.gov API first.
// MongoDB cache is the FALLBACK, not the first check.
//
// Flow:
//   1. Hit Data.gov API for fresh data
//   2. On success → write to MarketPriceCache + PriceHistory → return source:'LIVE'
//   3. On failure → serve MongoDB cache if it exists → return source:'MONGO_CACHE'
//   4. Nothing anywhere → return source:'FALLBACK' with empty markets
//
// MongoDB cache role:
//   - NOT a TTL-gated shortcut that skips the live API
//   - A reliable safety net so the app never shows zeros on a live-API outage
//   - Also accumulates PriceHistory over time for trend charts
import axios from 'axios';
import MarketPriceCache from '../models/MarketPriceCache.js';
import PriceHistory from '../models/PriceHistory.js';

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const PRICE_UNIT_DIVISOR = 100; // ₹/quintal → ₹/kg
const FETCH_LIMIT = 10000;

// Commodity name aliases for data.gov.in's exact-match filter.
const COMMODITY_ALIASES = { paddy: 'Paddy(Dhan)(Common)' };
function resolveCommodity(crop) {
  return COMMODITY_ALIASES[crop?.trim().toLowerCase()] || crop;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Live-first market price fetch.
 * Returns { markets, source, message? }
 *   source: 'LIVE' | 'MONGO_CACHE' | 'FALLBACK'
 */
export async function getMarketPricesWithMongoCache(filters = {}) {
  const { crop, state, district } = filters;

  // ── Step 1: Always try the live API first ──────────────────────────────────
  try {
    const records = await fetchLiveRecords({ crop, state, district });
    let normalized = normalizeRecords(records, crop);

    // Safety net: retry without commodity filter on naming quirks.
    if (!normalized.length && crop) {
      const broader = await fetchLiveRecords({ crop: undefined, state, district });
      const needle = crop.trim().toLowerCase();
      const matched = broader.filter((r) => {
        const c = pick(r, ['commodity', 'Commodity']);
        return c && c.trim().toLowerCase().startsWith(needle);
      });
      normalized = normalizeRecords(matched, crop);
    }

    if (!normalized.length) {
      // Live returned nothing — still try cache before declaring empty.
      const cached = await readFromMongoCache({ crop, state, district });
      if (cached.length) {
        return {
          markets: cached,
          source: 'MONGO_CACHE',
          message: 'No live results for this filter — showing cached prices.',
        };
      }
      return { markets: [], source: 'LIVE', message: 'No live market data found for this filter.' };
    }

    // ── Step 2: Write to MongoDB cache + PriceHistory ────────────────────────
    await writeToCacheAndHistory(normalized);

    const markets = normalized.map(toMarketShape);
    markets.sort((a, b) => (b.modalPrice || 0) - (a.modalPrice || 0));
    return { markets, source: 'LIVE' };

  } catch (err) {
    console.error('marketCacheService: live fetch failed:', err.message);

    // ── Step 3: Fall back to MongoDB cache ──────────────────────────────────
    const cached = await readFromMongoCache({ crop, state, district });
    if (cached.length) {
      return {
        markets: cached,
        source: 'MONGO_CACHE',
        message: 'Live market data unavailable — showing last cached prices from MongoDB.',
      };
    }

    // ── Step 4: Nothing available anywhere ──────────────────────────────────
    return {
      markets: [],
      source: 'FALLBACK',
      message: 'Live market data unavailable and no cached data exists yet. Please check DATA_GOV_API_KEY.',
    };
  }
}

/**
 * Ticker: always hit live first; fall back to MongoDB cache / PriceHistory.
 * No crop filter — returns ALL crops so the PriceTiles can show everything.
 */
export async function getTickerFromCache() {
  // Try live API with no filters to get ALL commodities.
  try {
    const records = await fetchLiveRecords({});
    const normalized = normalizeRecords(records, null);
    if (normalized.length) {
      // Write to cache & history while we have fresh data.
      await writeToCacheAndHistory(normalized);
      return buildTickerItems(normalized.map((r) => ({
        crop: r.crop, modalPrice: r.modalPrice, arrivalDate: r.arrivalDate,
      })));
    }
  } catch (err) {
    console.error('marketCacheService ticker: live fetch failed:', err.message);
  }

  // Fall back: MongoDB cache (all records, no filter).
  const cacheRecords = await MarketPriceCache.find({}).sort({ arrivalDate: -1 }).lean();
  if (cacheRecords.length) {
    return buildTickerFromCacheRecords(cacheRecords);
  }

  // Last resort: PriceHistory.
  return buildTickerFromPriceHistory();
}

// ─── Cache read helpers ────────────────────────────────────────────────────────

async function readFromMongoCache({ crop, state, district }) {
  const query = buildCacheQuery({ crop, state, district });
  const pipeline = [
    { $match: query },
    { $sort: { arrivalDate: -1 } },
    {
      $group: {
        _id: { market: '$market', crop: '$crop' },
        market: { $first: '$market' },
        crop: { $first: '$crop' },
        state: { $first: '$state' },
        district: { $first: '$district' },
        minPrice: { $first: '$minPrice' },
        modalPrice: { $first: '$modalPrice' },
        maxPrice: { $first: '$maxPrice' },
        arrivalDate: { $first: '$arrivalDate' },
        fetchedAt: { $first: '$fetchedAt' },
      },
    },
    { $sort: { modalPrice: -1 } },
  ];
  const rows = await MarketPriceCache.aggregate(pipeline);
  return rows.map(toMarketShape);
}

function buildCacheQuery({ crop, state, district }) {
  const q = {};
  if (crop) q.crop = { $regex: new RegExp(`^${escapeRegex(crop)}`, 'i') };
  if (state) q.state = { $regex: new RegExp(state, 'i') };
  if (district) q.district = { $regex: new RegExp(district, 'i') };
  return q;
}

// ─── Cache write helpers ───────────────────────────────────────────────────────

async function writeToCacheAndHistory(normalized) {
  // Upsert into MarketPriceCache.
  const cacheOps = normalized.map((r) => ({
    updateOne: {
      filter: { market: r.market, crop: r.crop, arrivalDate: r.arrivalDate },
      update: { $set: { ...r, fetchedAt: new Date() } },
      upsert: true,
    },
  }));
  if (cacheOps.length) {
    await MarketPriceCache.bulkWrite(cacheOps, { ordered: false }).catch((e) => {
      console.warn('MarketPriceCache bulkWrite warning (likely dup key):', e.message);
    });
  }

  // Upsert into PriceHistory so trend charts grow over time with real data.
  const histOps = normalized
    .filter((r) => r.modalPrice != null && r.arrivalDate)
    .map((r) => ({
      updateOne: {
        filter: { crop: r.crop, market: r.market, date: r.arrivalDate },
        update: { $set: { crop: r.crop, market: r.market, date: r.arrivalDate, modalPrice: r.modalPrice } },
        upsert: true,
      },
    }));
  if (histOps.length) {
    await PriceHistory.bulkWrite(histOps, { ordered: false }).catch(() => {});
  }
}

// ─── Ticker builders ───────────────────────────────────────────────────────────

async function buildTickerFromPriceHistory() {
  const all = await PriceHistory.find({}).sort({ date: 1 }).lean();
  if (!all.length) return [];
  return buildTickerItems(all.map((r) => ({
    crop: r.crop, modalPrice: r.modalPrice, arrivalDate: r.date,
  })));
}

function buildTickerFromCacheRecords(records) {
  return buildTickerItems(records.map((r) => ({
    crop: r.crop, modalPrice: r.modalPrice, arrivalDate: r.arrivalDate,
  })));
}

function buildTickerItems(rows) {
  const byCrop = {};
  for (const r of rows) {
    (byCrop[r.crop] ||= []).push(r);
  }
  const ticker = Object.entries(byCrop).map(([crop, items]) => {
    const dateKey = (d) => new Date(d).toISOString().slice(0, 10);
    const byDate = {};
    for (const r of items) (byDate[dateKey(r.arrivalDate)] ||= []).push(r.modalPrice);
    const dates = Object.keys(byDate).sort();
    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const latestPrice = Math.round(avg(byDate[dates[dates.length - 1]]) * 100) / 100;
    const prevDate = dates[dates.length - 2];
    const prevPrice = prevDate ? avg(byDate[prevDate]) : latestPrice;
    const changePct = prevPrice ? Math.round(((latestPrice - prevPrice) / prevPrice) * 10000) / 100 : 0;
    const sparkline = dates.slice(-7).map((d) => Math.round(avg(byDate[d]) * 100) / 100);
    return {
      crop,
      price: latestPrice,
      changePct,
      trend: changePct > 0.05 ? 'up' : changePct < -0.05 ? 'down' : 'stable',
      sparkline,
      asOf: dates[dates.length - 1],
    };
  });
  ticker.sort((a, b) => a.crop.localeCompare(b.crop));
  return ticker;
}

// ─── Live API fetching ─────────────────────────────────────────────────────────

async function fetchLiveRecords({ crop, state, district }) {
  if (!process.env.DATA_GOV_API_KEY) throw new Error('DATA_GOV_API_KEY is not configured');
  const params = {
    'api-key': process.env.DATA_GOV_API_KEY,
    format: 'json',
    limit: FETCH_LIMIT,
  };
  if (crop) params['filters[commodity]'] = resolveCommodity(crop);
  if (state) params['filters[state]'] = state;
  if (district) params['filters[district]'] = district;
  const { data } = await axios.get(API_URL, { params, timeout: 12000 });
  return Array.isArray(data?.records) ? data.records : [];
}

// ─── Record normalization ──────────────────────────────────────────────────────

function normalizeRecords(records, canonicalCrop) {
  const groups = new Map();
  for (const raw of records) {
    const market = pick(raw, ['market', 'Market']);
    const crop = pick(raw, ['commodity', 'Commodity']);
    if (!market || !crop) continue;
    const key = `${market}||${crop}`;
    const entry = {
      market,
      // Use canonicalCrop when provided (e.g. 'Paddy' instead of 'Paddy(Dhan)(Common)').
      // When fetching all crops (no filter), keep the raw commodity name.
      crop: canonicalCrop || crop,
      state: pick(raw, ['state', 'State']) || '',
      district: pick(raw, ['district', 'District']) || '',
      minPrice: toPerKg(pick(raw, ['min_price', 'Min_Price'])),
      modalPrice: toPerKg(pick(raw, ['modal_price', 'Modal_Price'])),
      maxPrice: toPerKg(pick(raw, ['max_price', 'Max_Price'])),
      arrivalDate: parseArrivalDate(pick(raw, ['arrival_date', 'Arrival_Date'])),
    };
    if (entry.modalPrice == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const out = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => (b.arrivalDate?.getTime() || 0) - (a.arrivalDate?.getTime() || 0));
    out.push(rows[0]);
  }
  return out;
}

function toMarketShape(r) {
  return {
    name: r.market,
    channel: 'APMC',
    state: r.state,
    district: r.district,
    crop: r.crop,
    distanceKm: null,
    minPrice: r.minPrice,
    modalPrice: r.modalPrice,
    maxPrice: r.maxPrice,
    arrivalQuantityTonnes: null,
    trend: 'stable',
    source: 'AGMARKNET',
    lastUpdated: r.arrivalDate || r.fetchedAt || new Date(),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function pick(record, keys) {
  for (const k of keys) {
    if (record?.[k] !== undefined && record[k] !== null && record[k] !== '') return record[k];
  }
  return undefined;
}

function toPerKg(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : Math.round((n / PRICE_UNIT_DIVISOR) * 100) / 100;
}

function parseArrivalDate(value) {
  if (!value) return null;
  const parts = String(value).split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}