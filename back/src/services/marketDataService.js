// services/marketDataService.js
//
// Adapter around "where market price data comes from". This now calls the
// live data.gov.in "Current Daily Price of Various Commodities for Various
// Markets (Mandi)" API directly — the seeded Market collection / DEMO_SEED
// data is no longer read here.
//
//   https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
//       ?api-key=<DATA_GOV_API_KEY>&format=json&limit=10000
//
// Reliability rule (see spec section 24): if the real data source is
// unavailable, we NEVER let the app crash. We now do this with a small
// in-memory cache instead of falling back to seed data — a failed live
// call returns the last successful live response for that filter combo
// (source: 'CACHE'), and only returns empty (source: 'FALLBACK') if we
// have never successfully fetched that combo yet.
//
// NOTE ON UNITS: this dataset reports min/max/modal price in ₹ per
// QUINTAL (100 kg), while the rest of the app (schema, UI) works in
// ₹ per kg. PRICE_UNIT_DIVISOR below converts it. If your api-key/resource
// ever returns per-kg prices instead, set PRICE_UNIT_DIVISOR to 1.
import axios from 'axios';
import PriceHistory from '../models/PriceHistory.js';
import TrackedMarketQuery from '../models/TrackedMarketQuery.js';

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const PRICE_UNIT_DIVISOR = 100; // ₹/quintal -> ₹/kg. Set to 1 if the API already returns ₹/kg.
const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS) || 10 * 60 * 1000; // 10 min
const FETCH_LIMIT = 10000;

// data.gov.in publishes a single public "sample" key in its own API docs
// (used by every tutorial/demo that copies it verbatim). It is capped at
// a maximum of 10 records PER REQUEST regardless of the `limit` param —
// confirmed live: requesting limit=10000 with this key still comes back
// with limit:10, count:10 in the response envelope — and it is shared
// globally across everyone who never registered their own key, so it is
// also the first thing to get rate-limited under any real load. If a
// crop's matching rows aren't within whichever 10 records the gateway
// happens to hand back, `transformRecords` legitimately returns zero
// markets even though the live call "succeeded". Registering a free key
// at https://data.gov.in (My Account -> Generate API Key) removes this
// cap entirely. We detect it here so the failure is diagnosable instead
// of looking like a silent "nothing works".
const KNOWN_SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
function isSampleKey(key) {
  return !key || key.trim() === KNOWN_SAMPLE_KEY;
}

// data.gov.in's `filters[commodity]` match is exact — some crops are
// listed there under a longer/different name than what the app's crop
// picker uses (e.g. plain "Paddy" never matches; the dataset only has
// "Paddy(Dhan)(Common)"). This is why a filter for a real, currently-
// traded crop can still come back with zero rows ("No live market data
// found for this filter") even though the live call itself succeeded.
// Extend this list as you find more mismatches in server logs (each one
// logs the exact requested crop name when the filtered call misses).
const COMMODITY_ALIASES = {
  paddy: 'Paddy(Dhan)(Common)',
  soybean: 'Soyabean',
  cotton: 'Cotton',
};
function resolveCommodity(crop) {
  return COMMODITY_ALIASES[crop?.trim().toLowerCase()] || crop;
}

// filterKey -> { markets: Array, fetchedAt: number }
const cache = new Map();

function cacheKey(filters) {
  return JSON.stringify({
    crop: filters.crop || '',
    state: filters.state || '',
    district: filters.district || '',
  });
}

/**
 * @param {Object} filters - { crop, state, district }
 * @returns {Promise<{ markets: Array, source: 'LIVE'|'CACHE'|'FALLBACK', message?: string }>}
 */
export async function getMarketPrices(filters = {}) {
  const key = cacheKey(filters);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { markets: cached.markets, source: 'CACHE' };
  }

  try {
    let records = await fetchLiveRecords(filters);
    let markets = transformRecords(records);
    let usedFallback = null; // tracks which filter we had to drop, for the UI message

    // Fallback ladder: mandi reporting is sparse at the district level —
    // a specific district can genuinely have zero submissions for a
    // given day (confirmed live: filters={state:"Karnataka",
    // district:"Kolar"} came back total:0 for EVERY commodity, not just
    // one crop). The previous version only ever dropped the crop filter
    // and kept re-trying the same dead-end state+district combo forever.
    // Now: if state+district together yield nothing, drop district and
    // retry at state level; if that's also empty, drop state too and
    // fall back to nationwide for this crop. Only after nationwide comes
    // back empty do we call it "no live data".
    if (!markets.length && filters.district && (filters.state || filters.crop)) {
      const withoutDistrict = { ...filters, district: undefined };
      records = await fetchLiveRecords(withoutDistrict);
      markets = transformRecords(records);
      if (markets.length) usedFallback = `district "${filters.district}" had no reports today — showing results for ${filters.state || 'the wider region'} instead`;
    }

    if (!markets.length && filters.state) {
      const withoutState = { ...filters, state: undefined, district: undefined };
      records = await fetchLiveRecords(withoutState);
      markets = transformRecords(records);
      if (markets.length) usedFallback = `no reports found for ${filters.state}${filters.district ? `/${filters.district}` : ''} today — showing nationwide results instead`;
    }

    // Safety net: the exact-match commodity filter can legitimately
    // return nothing for a crop whose data.gov.in listing name differs
    // from ours in ways the alias map above doesn't cover yet (spelling,
    // a bracketed variety suffix, etc). Retry once with no commodity
    // filter (region filters already dropped above if they were the
    // problem) and match client-side instead of declaring "no data" on
    // a naming quirk alone.
    if (!markets.length && filters.crop) {
      const broader = await fetchLiveRecords({ crop: undefined });
      // Normalize away bracketed variety/grade suffixes (e.g.
      // "Paddy(Dhan)(Common)" -> "paddy") so a match works regardless of
      // which side has the extra qualifier, not just the strict
      // startsWith the previous version used.
      const normalize = (s) => s.trim().toLowerCase().replace(/\(.*?\)/g, '').trim();
      const needle = normalize(filters.crop);
      const matched = broader.filter((r) => {
        const c = pick(r, ['commodity', 'Commodity']);
        if (!c) return false;
        const hay = normalize(c);
        return hay === needle || hay.startsWith(needle) || needle.startsWith(hay);
      });
      if (!matched.length) {
        console.warn(`marketDataService: broader retry also found no commodity matching "${filters.crop}" among ${broader.length} nationwide record(s) — this crop likely has no mandi submissions right now, or the dataset uses a very different name for it.`);
      } else {
        usedFallback = `"${filters.crop}" had no reports under that exact name today — showing closest match instead`;
      }
      markets = transformRecords(matched);
    }

    if (!markets.length) {
      return { markets: [], source: 'LIVE', message: 'No live market data found for this filter.' };
    }

    cache.set(key, { markets, fetchedAt: Date.now() });
    // Phase 2: turn this successful live fetch into real, dynamically
    // collected history instead of relying on any seed/mock dataset.
    // Fire-and-forget — a DB hiccup here must never break the live
    // price response the farmer is waiting on.
    persistDailySnapshot(markets).catch((err) => console.error('persistDailySnapshot failed:', err.message));
    if (filters.crop) {
      registerTrackedQuery(filters).catch((err) => console.error('registerTrackedQuery failed:', err.message));
    }
    return { markets, source: 'LIVE', message: usedFallback || undefined };
  } catch (err) {
    console.error('marketDataService: live fetch failed:', err.message);
    const sampleKeyHint = isSampleKey(process.env.DATA_GOV_API_KEY)
      ? ' You are currently using the shared data.gov.in sample key — register your own free key at https://data.gov.in for reliable results.'
      : '';

    if (cached) {
      // Serve the last good live response rather than crash or invent data.
      return {
        markets: cached.markets,
        source: 'CACHE',
        message: `Live market data unavailable right now (${err.message}) — showing the last successful fetch.${sampleKeyHint}`,
      };
    }

    return {
      markets: [],
      source: 'FALLBACK',
      message: `Live market data unavailable and no cached data exists yet for this filter (${err.message}).${sampleKeyHint}`,
    };
  }
}

let sampleKeyWarned = false;

/** Calls the data.gov.in resource API and returns its raw `records` array. */
async function fetchLiveRecords(filters, attempt = 1) {
  if (!process.env.DATA_GOV_API_KEY) {
    throw new Error('DATA_GOV_API_KEY is not configured');
  }

  if (isSampleKey(process.env.DATA_GOV_API_KEY) && !sampleKeyWarned) {
    sampleKeyWarned = true;
    console.warn(
      'marketDataService: DATA_GOV_API_KEY is the public data.gov.in sample key. ' +
      'That key is hard-capped at 10 records per request (regardless of the limit ' +
      'param sent) and is shared/rate-limited across every app that never registered ' +
      'its own key. This is the most common reason "live market data" looks empty or ' +
      'flaky for specific crop/state/district filters. Register a free key at ' +
      'https://data.gov.in (My Account -> Generate API Key) and set it as ' +
      'DATA_GOV_API_KEY to remove this cap.'
    );
  }

  const params = {
    'api-key': process.env.DATA_GOV_API_KEY,
    format: 'json',
    limit: FETCH_LIMIT,
  };
  // data.gov.in resource API filter syntax: filters[<field>]=<value>
  const resolvedCommodity = filters.crop ? resolveCommodity(filters.crop) : null;
  if (resolvedCommodity) params['filters[commodity]'] = resolvedCommodity;
  if (filters.state) params['filters[state]'] = filters.state;
  if (filters.district) params['filters[district]'] = filters.district;

  let data;
  try {
    ({ data } = await axios.get(API_URL, {
      params,
      timeout: 15000, // bumped from 10s — this gateway is occasionally slow, not just occasionally empty
      // data.gov.in's gateway has been observed to hand back a "valid but
      // empty" 200 response (records: [], total: 0) for identical
      // requests that succeed fine from an actual browser — a classic
      // sign of a WAF/bot-filter keying off headers a plain HTTP client
      // doesn't send. A realistic browser User-Agent/Accept fixes this
      // for most Indian govt API gateways; it's a harmless no-op if that
      // isn't what's happening here.
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    }));
  } catch (err) {
    // Surface HTTP-level failures (rate limit, bad gateway, auth) with an
    // actionable reason instead of a bare axios message like "Request
    // failed with status code 429".
    const status = err.response?.status;
    if (status === 429) {
      throw new Error(
        `data.gov.in rate limit hit (HTTP 429)${isSampleKey(process.env.DATA_GOV_API_KEY) ? ' — you are on the shared sample key; register your own free key at https://data.gov.in' : '; the app will retry on the next request'}.`
      );
    }
    if (status === 403 || status === 401) {
      throw new Error(`data.gov.in rejected the API key (HTTP ${status}) — check DATA_GOV_API_KEY is a valid, currently-active key.`);
    }
    throw err;
  }

  // ALWAYS log the response envelope's bookkeeping fields (not the
  // records themselves — that could be thousands of rows). Previously we
  // only logged anything when something looked wrong, which made a
  // "successful looking" but empty response (200 OK, records: [],
  // total: 0) indistinguishable from "everything is fine" in the logs —
  // exactly the failure mode that made this bug invisible. Now every
  // live call leaves a one-line trail of what data.gov.in actually said.
  console.log(
    `marketDataService: data.gov.in response — status=${data?.status ?? '?'} ` +
    `total=${data?.total ?? '?'} count=${data?.count ?? '?'} limit=${data?.limit ?? '?'} ` +
    `offset=${data?.offset ?? '?'} records.length=${Array.isArray(data?.records) ? data.records.length : 'not-an-array'} ` +
    `filters=${JSON.stringify({ commodity: params['filters[commodity]'], state: params['filters[state]'], district: params['filters[district]'] })}`
  );

  // data.gov.in's gateway can return HTTP 200 with an error body instead
  // of throwing (invalid/expired api-key, unregistered resource, rate
  // limit) — e.g. { "error": { "code": "...", "message": "..." } } or
  // { "message": "Invalid api-key" }. Left unchecked, this silently
  // looked identical to "genuinely no mandi reported a price today" and
  // surfaced the same misleading "No live market data found for this
  // filter" message for every single crop. Surface it as a real error
  // instead, and log the raw body once so the actual reason (bad key vs
  // rate-limited vs something else) is visible in the server logs.
  if (data?.error || (data?.message && !Array.isArray(data?.records))) {
    const reason = data?.error?.message || data?.error?.code || data?.message || 'unknown error';
    console.error('marketDataService: data.gov.in returned an error payload instead of records:', JSON.stringify(data).slice(0, 500));
    throw new Error(`data.gov.in API error: ${reason}`);
  }

  if (Array.isArray(data?.records) && !data.records.length && filters.crop) {
    // Genuinely 200 OK with zero rows for this exact filter. Log the
    // resolved commodity name we actually sent, so a naming mismatch
    // (spec section note above) is visible without guessing.
    console.warn(`marketDataService: data.gov.in returned 0 records for filters[commodity]="${resolvedCommodity}" (requested crop: "${filters.crop}").`);
  }

  // data.gov.in's gateway is documented to be flaky — occasionally
  // returning a "valid" 200 with total:0/records:[] for a request that
  // succeeds moments later with no change on our end. Retry once before
  // accepting a 0 total, whether or not a filter was applied — cheap
  // (half-second, capped at 2 retries) and avoids treating a transient
  // gateway hiccup as "no live data for this crop".
  if (Number(data?.total) === 0 && attempt < 3) {
    console.warn(`marketDataService: data.gov.in returned total=0 (attempt ${attempt}, filters=${JSON.stringify({ commodity: params['filters[commodity]'] })}) — retrying, this API is known to be intermittent.`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return fetchLiveRecords(filters, attempt + 1);
  }

  return Array.isArray(data?.records) ? data.records : [];
}

/**
 * Normalizes raw API records into the Market shape the rest of the app
 * expects, grouping by market+commodity so we only keep the latest price
 * per mandi and can derive a simple up/down/stable trend from the
 * previous available arrival date in the same fetch.
 */
function transformRecords(records) {
  const groups = new Map();

  for (const raw of records) {
    const name = pick(raw, ['market', 'Market']);
    const crop = pick(raw, ['commodity', 'Commodity']);
    if (!name || !crop) continue; // can't identify this row, skip it

    const groupKey = `${name}||${crop}`;
    const entry = {
      name,
      crop,
      state: pick(raw, ['state', 'State']) || '',
      district: pick(raw, ['district', 'District']) || '',
      minPrice: toPerKg(pick(raw, ['min_price', 'Min_Price'])),
      maxPrice: toPerKg(pick(raw, ['max_price', 'Max_Price'])),
      modalPrice: toPerKg(pick(raw, ['modal_price', 'Modal_Price'])),
      arrivalDate: parseArrivalDate(pick(raw, ['arrival_date', 'Arrival_Date'])),
    };
    if (entry.modalPrice == null) continue; // no usable price on this row

    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(entry);
  }

  const markets = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => (b.arrivalDate?.getTime() || 0) - (a.arrivalDate?.getTime() || 0));
    const latest = rows[0];
    const previous = rows[1];

    let trend = 'stable';
    if (previous && previous.modalPrice != null) {
      if (latest.modalPrice > previous.modalPrice) trend = 'up';
      else if (latest.modalPrice < previous.modalPrice) trend = 'down';
    }

    markets.push({
      name: latest.name,
      channel: 'APMC', // this dataset covers physical APMC mandi arrivals only
      state: latest.state,
      district: latest.district,
      crop: latest.crop,
      // Not available from this API (no per-mandi coordinates or distance
      // reference point) — left null rather than guessed. Consumers that
      // compute transport cost from distanceKm should handle null here.
      distanceKm: null,
      minPrice: latest.minPrice,
      modalPrice: latest.modalPrice,
      maxPrice: latest.maxPrice,
      // Not present in this resource (it's a price-only dataset).
      arrivalQuantityTonnes: null,
      trend,
      source: 'AGMARKNET',
      lastUpdated: latest.arrivalDate || new Date(),
    });
  }

  markets.sort((a, b) => (b.modalPrice || 0) - (a.modalPrice || 0));
  return markets;
}

function pick(record, keys) {
  for (const k of keys) {
    if (record?.[k] !== undefined && record[k] !== null && record[k] !== '') return record[k];
  }
  return undefined;
}

function toPerKg(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.round((n / PRICE_UNIT_DIVISOR) * 100) / 100;
}

/** Normalizes a Date to midnight local time, so repeated polls on the
 * same calendar day upsert the same PriceHistory row instead of piling
 * up duplicates. */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Upserts one PriceHistory row per crop+market for today, from a real
 * live fetch. Never throws — callers treat this as fire-and-forget. */
async function persistDailySnapshot(markets) {
  const day = startOfDay();
  const ops = markets
    .filter((m) => m.modalPrice != null)
    .map((m) => ({
      updateOne: {
        filter: { crop: m.crop, market: m.name, date: day },
        update: {
          $set: {
            state: m.state,
            district: m.district,
            minPrice: m.minPrice,
            modalPrice: m.modalPrice,
            maxPrice: m.maxPrice,
            source: 'AGMARKNET',
          },
        },
        upsert: true,
      },
    }));
  if (ops.length) await PriceHistory.bulkWrite(ops, { ordered: false });
}

/** Registers a {crop, state, district} combination so the background
 * history scheduler keeps polling it daily even after this request
 * ends — this is how 30 days of REAL history accumulates over time. */
async function registerTrackedQuery({ crop, state, district }) {
  await TrackedMarketQuery.updateOne(
    { crop, state: state || '', district: district || '' },
    { $setOnInsert: { firstSeenAt: new Date() } },
    { upsert: true },
  );
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