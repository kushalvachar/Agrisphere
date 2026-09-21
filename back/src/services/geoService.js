// services/geoService.js
//
// Geocoding + road-distance between a farmer and a market.
//
// External APIs used:
//   1. Geoapify Geocoding API — place name → lat/lng
//        https://api.geoapify.com/v1/geocode/search
//   2. OSRM — two lat/lng → road distance/duration
//        https://router.project-osrm.org/route/v1/driving/…
//
// WHY GEOAPIFY (vs the original Nominatim implementation):
// Market names from AGMARKNET/data.gov.in are messy —
// "cuddalore(uzhavar sandhai )", "mannargudi ii(uzhavar sandhai)" etc.
// Nominatim returned 403 / no results for a lot of these raw strings.
// Geoapify's geocoder is far more tolerant of messy/partial addresses
// and doesn't enforce a strict 1 req/sec throttle, so it resolves a much
// higher fraction of real AGMARKNET market names directly.
//
// Search strategy (tried in order, first hit wins and is cached):
//   1. cleaned market name + district + state + country — most specific
//   2. district + state + country                       — broad, very reliable
//   3. cleaned market name + state + country             — no district available
//   4. state + country                                   — last resort centroid
//
// Each attempt is cached independently so we never retry the same query.
// NEGATIVE results (null) are also cached (for NULL_CACHE_TTL_MS) to
// prevent re-hitting Geoapify for names it consistently can't resolve.
//
// Requires GEOAPIFY_API_KEY in your environment (free tier: 3,000 req/day).
// Get one at https://www.geoapify.com/
import axios from 'axios';
import GeoCache from '../models/GeoCache.js';
import RouteCache from '../models/RouteCache.js';

const GEOAPIFY_BASE_URL = process.env.GEOAPIFY_BASE_URL || 'https://api.geoapify.com/v1/geocode/search';
const GEOAPIFY_API_KEY  = process.env.GEOAPIFY_API_KEY;
const OSRM_BASE_URL     = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

const GEO_CACHE_TTL_MS   = 90 * 24 * 60 * 60 * 1000;  // 90 days — places don't move
const ROUTE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days — road distances rarely change
const NULL_CACHE_TTL_MS  =  7 * 24 * 60 * 60 * 1000;  //  7 days — negative cache: don't retry a failed geocode for a week

if (!GEOAPIFY_API_KEY) {
  console.warn('geoService: GEOAPIFY_API_KEY is not set — all geocode calls will fail.');
}

// ── In-memory first-layer cache (fast path, survives only until restart) ─────
// Values: { lat, lng, cachedAt } for hits; { null: true, cachedAt } for misses
const geoMemCache   = new Map();
const routeMemCache = new Map();

// ── Optional light throttle ───────────────────────────────────────────────────
// Geoapify has no strict per-second policy like Nominatim, but we keep a
// small configurable gap to be gentle on free-tier accounts and avoid
// bursty 429s when many markets are geocoded in a loop (e.g. seeding).
const GEOAPIFY_MIN_INTERVAL_MS = Number(process.env.GEOAPIFY_MIN_INTERVAL_MS || 0);
let lastGeoapifyCallAt = 0;
async function throttleGeoapify() {
  if (!GEOAPIFY_MIN_INTERVAL_MS) return;
  const wait = lastGeoapifyCallAt + GEOAPIFY_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeoapifyCallAt = Date.now();
}

// ── Name cleaning ─────────────────────────────────────────────────────────────
// Strips noise that geocoders don't understand:
//   "cuddalore(uzhavar sandhai )"  → "cuddalore"
//   "mannargudi i(uzhavar sandhai)"→ "mannargudi"
//   "patiala(new anaj mandi) apmc" → "patiala"
//   "kknagar"                      → "kknagar"  (left as-is; district will handle it)
//   "viramgam apmc"                → "viramgam"
function cleanMarketName(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    // strip anything in parentheses
    .replace(/\(.*?\)/g, '')
    // strip trailing roman numerals (i, ii, iii, iv, v, vi …)
    .replace(/\s+[ivxlcdm]+$/i, '')
    // strip common noise words
    .replace(/\b(apmc|market|mandi|uzhavar|sandhai|new|anaj)\b/gi, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Cache key helpers ─────────────────────────────────────────────────────────
function geoKey(query) {
  return query.toLowerCase().trim();
}

function routeKey(origin, dest) {
  const r = (n) => Math.round(n * 1000) / 1000; // ~100 m grid → nearby lookups share cache
  return `${r(origin.lat)},${r(origin.lng)}|${r(dest.lat)},${r(dest.lng)}`;
}

// ── Single Geoapify fetch (one attempt, no retries) ──────────────────────────
async function geoapifySearch(q) {
  await throttleGeoapify();
  const { data } = await axios.get(GEOAPIFY_BASE_URL, {
    params: {
      text: q,
      limit: 1,
      filter: 'countrycode:in',
      apiKey: GEOAPIFY_API_KEY,
    },
    timeout: 10000,
  });
  const hit = data?.features?.[0];
  if (!hit) return null;
  const lat = Number(hit.properties?.lat);
  const lng = Number(hit.properties?.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, displayName: hit.properties?.formatted || q };
}

// ── Persist to MongoDB (best-effort; never blocks the response) ───────────────
async function persistGeoHit(key, lat, lng, displayName) {
  await GeoCache.updateOne(
    { queryKey: key },
    { queryKey: key, lat, lng, displayName },
    { upsert: true },
  ).catch(() => {});
}
async function persistGeoMiss(key) {
  // Store a sentinel document with implausible coords so the 7-day
  // negative cache survives restarts. We detect it by a special flag field.
  await GeoCache.updateOne(
    { queryKey: key },
    { queryKey: key, lat: 0, lng: 0, displayName: '__NULL__' },
    { upsert: true },
  ).catch(() => {});
}

// ── Core geocode function ──────────────────────────────────────────────────────
// Tries a list of candidate query strings in order, returns the first hit.
async function tryQueries(candidates) {
  for (const q of candidates) {
    if (!q) continue;
    const key = geoKey(q);

    // 1) in-memory cache (hits AND misses)
    const mem = geoMemCache.get(key);
    if (mem) {
      if (Date.now() - mem.cachedAt < (mem.null ? NULL_CACHE_TTL_MS : GEO_CACHE_TTL_MS)) {
        if (mem.null) continue;          // cached miss — try next candidate
        return { lat: mem.lat, lng: mem.lng };
      }
    }

    // 2) MongoDB cache
    const persisted = await GeoCache.findOne({ queryKey: key }).lean().catch(() => null);
    if (persisted) {
      const age = Date.now() - new Date(persisted.updatedAt).getTime();
      const isNull = persisted.displayName === '__NULL__';
      const ttl = isNull ? NULL_CACHE_TTL_MS : GEO_CACHE_TTL_MS;
      if (age < ttl) {
        if (isNull) {
          geoMemCache.set(key, { null: true, cachedAt: Date.now() });
          continue;                       // cached miss — try next candidate
        }
        geoMemCache.set(key, { lat: persisted.lat, lng: persisted.lng, cachedAt: Date.now() });
        return { lat: persisted.lat, lng: persisted.lng };
      }
    }

    // 3) Live Geoapify call
    try {
      const result = await geoapifySearch(q);
      if (result) {
        geoMemCache.set(key, { lat: result.lat, lng: result.lng, cachedAt: Date.now() });
        persistGeoHit(key, result.lat, result.lng, result.displayName);
        return { lat: result.lat, lng: result.lng };
      } else {
        // Cache the miss so we don't retry this exact query for 7 days
        geoMemCache.set(key, { null: true, cachedAt: Date.now() });
        persistGeoMiss(key);
        // continue to next candidate
      }
    } catch (err) {
      // Network / 401 / 429 / timeout — log once and move on; do NOT cache so
      // a transient failure doesn't permanently blacklist a real place.
      console.warn(`geoService: geocode failed for "${q}" — ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  }
  return null; // all candidates exhausted
}

// ── Public API: geocode a market ──────────────────────────────────────────────
/**
 * Geocodes a market (or any place) to { lat, lng }.
 *
 * Search order (first success wins):
 *   1. cleaned name + district + state — e.g. "Sundarapuram, Coimbatore, Tamil Nadu, India"
 *   2. district + state                — e.g. "Coimbatore, Tamil Nadu, India"
 *   3. cleaned name + state            — e.g. "Sundarapuram, Tamil Nadu, India"
 *   4. state                           — e.g. "Tamil Nadu, India"  (centroid fallback)
 *
 * Returns null only if every candidate fails — callers must fall back
 * to their own heuristic (same-district flat-rate etc.).
 */
export async function geocodePlace({ name, district, state, country = 'India' }) {
  const candidates = [];
  const cleanName = cleanMarketName(name);

  // Candidate 1: cleaned market name + district + state (most specific — Geoapify
  // handles this kind of free-text query well, unlike Nominatim)
  if (cleanName && district && state && cleanName !== district.toLowerCase()) {
    candidates.push(`${cleanName}, ${district}, ${state}, ${country}`);
  }

  // Candidate 2: district + state (very reliable — Geoapify knows every Indian district)
  if (district && state) {
    candidates.push(`${district}, ${state}, ${country}`);
  } else if (district) {
    candidates.push(`${district}, ${country}`);
  }

  // Candidate 3: cleaned market name + state (useful when no district is in the object)
  if (cleanName && state && cleanName !== district?.toLowerCase()) {
    candidates.push(`${cleanName}, ${state}, ${country}`);
  }

  // Candidate 4: state centroid (last resort — at least gets us in the right state)
  if (state) {
    candidates.push(`${state}, ${country}`);
  }

  return tryQueries(candidates);
}

// ── Haversine straight-line distance ─────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ── OSRM road route ───────────────────────────────────────────────────────────
async function osrmRoute(origin, dest) {
  const url = `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  const { data } = await axios.get(url, { params: { overview: 'false' }, timeout: 8000 });
  const route = data?.routes?.[0];
  if (!route) return null;
  return { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
}

// ── Road distance between two coord pairs ─────────────────────────────────────
/**
 * Always resolves — never throws. Falls back:
 *   OSRM road distance → haversine × 1.3 (road-indirectness factor)
 */
export async function getRouteDistanceKm(originCoords, destCoords) {
  if (!originCoords || !destCoords) return null;

  const key = routeKey(originCoords, destCoords);

  const mem = routeMemCache.get(key);
  if (mem && Date.now() - mem.cachedAt < ROUTE_CACHE_TTL_MS) {
    return { distanceKm: mem.distanceKm, method: mem.method };
  }

  const persisted = await RouteCache.findOne({ routeKey: key }).lean().catch(() => null);
  if (persisted && Date.now() - new Date(persisted.updatedAt).getTime() < ROUTE_CACHE_TTL_MS) {
    routeMemCache.set(key, { distanceKm: persisted.distanceKm, method: persisted.method, cachedAt: Date.now() });
    return { distanceKm: persisted.distanceKm, method: persisted.method };
  }

  let distanceKm;
  let method;

  try {
    const osrm = await osrmRoute(originCoords, destCoords);
    if (osrm) {
      distanceKm = Math.round(osrm.distanceKm * 10) / 10;
      method = 'osrm';
    }
  } catch (err) {
    console.warn('geoService: OSRM route failed —', err.message);
  }

  if (distanceKm == null) {
    distanceKm = Math.round(haversineKm(originCoords, destCoords) * 1.3 * 10) / 10;
    method = 'haversine';
  }

  routeMemCache.set(key, { distanceKm, method, cachedAt: Date.now() });
  await RouteCache.updateOne(
    { routeKey: key },
    { routeKey: key, distanceKm, method },
    { upsert: true },
  ).catch(() => {});

  return { distanceKm, method };
}

// ── Convenience: farmer → market distance ────────────────────────────────────
/**
 * Geocodes the farmer's location (skips geocoding if lat/lng already on file)
 * and the market, then returns road distance.
 * Returns null on total failure — callers fall back to flat-rate heuristics.
 */
export async function getFarmerToMarketDistanceKm(farmerLocation, market) {
  if (!farmerLocation) return null;

  const originCoords =
    farmerLocation.lat != null && farmerLocation.lng != null
      ? { lat: farmerLocation.lat, lng: farmerLocation.lng }
      : await geocodePlace({
          name:     farmerLocation.village,
          district: farmerLocation.district,
          state:    farmerLocation.state,
        });

  if (!originCoords) return null;

  const destCoords = await geocodePlace({
    name:     market.name,
    district: market.district,
    state:    market.state,
  });

  if (!destCoords) return null;

  return getRouteDistanceKm(originCoords, destCoords);
}