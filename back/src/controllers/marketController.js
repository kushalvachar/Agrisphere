// controllers/marketController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getMarketPrices } from '../services/marketDataService.js';
import { calculateNetRealization } from '../services/profitCalculator.js';
import { getFarmerToMarketDistanceKm } from '../services/geoService.js';
import { getPriceTrend } from '../services/priceTrendService.js';
import { getMarketActivity } from '../services/marketActivityService.js';
import { getHistoricalTrend } from '../services/historicalMarketService.js';
import Logistics from '../models/Logistics.js';
import Farmer from '../models/Farmer.js';

const COST_PER_KM_PER_KG = 0.02; // ₹/kg per km - same rate the old distanceKm estimate used

export const listMarkets = asyncHandler(async (req, res) => {
  const { farmerId, lat, lng } = req.query;
  let { crop, district, state } = req.query;

  // Market Intelligence Auto Flow (farmer-driven): when a farmerId is
  // supplied, the farmer's OWN registered crop (Farmer.currentCrop.crop)
  // is the only commodity filter, and no state/district filter is
  // applied at all — we want nationwide markets for that one crop, not
  // a region-narrowed subset. Any `crop`/`state`/`district` query
  // params sent alongside farmerId are ignored on purpose, so the
  // result always reflects the farmer's real profile rather than
  // whatever the client happened to pass.
  // Callers that don't send a farmerId (e.g. the generic /demo route,
  // which has no backing Farmer document) keep the original manual
  // crop + state/district filtering behavior untouched below.
  let farmerDriven = false;
  let farmerLocation = null;

  if (farmerId) {
    const farmer = await Farmer.findById(farmerId).lean();
    if (farmer) {
      crop = farmer.currentCrop?.crop || crop;
      farmerDriven = true;
      if (farmer.location) farmerLocation = farmer.location;
    }
  }

  // Phase 4: Distance-Based Market Discovery. radiusKm switches this
  // endpoint from "rank by net realization" (the default, used by the
  // farmer dashboard) to "find markets within N km, nearest first" —
  // used by the dedicated nearby-markets discovery UI. Only these four
  // values are offered in the UI; anything else falls back to no cap.
  const radiusKm = [50, 100, 200, 500].includes(Number(req.query.radiusKm)) ? Number(req.query.radiusKm) : null;

  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    // Real browser Geolocation API coordinates (navigator.geolocation),
    // passed straight through — geoService already accepts lat/lng
    // directly and skips geocoding in that case. Takes priority over the
    // farmer's stored profile location for distance calc, whether or
    // not farmerId is also present.
    farmerLocation = { lat: Number(lat), lng: Number(lng) };
  }

  // Farmer-driven flow: crop is the ONLY filter — never narrow by
  // state/district, so mandi data comes back nationwide for that crop.
  const effectiveState = farmerDriven ? undefined : (state || farmerLocation?.state);
  const effectiveDistrict = farmerDriven ? undefined : (district || farmerLocation?.district);

  const { markets, source, message } = await getMarketPrices({ crop, state: effectiveState, district: effectiveDistrict });

  const logisticsOptions = await Logistics.find({}).lean();

  // Distance + transport cost per market, resolved in parallel. Real road
  // distance via OSRM when both ends can be geocoded; otherwise falls all
  // the way down to the old same-district/same-state flat rate so a
  // geocoding/OSRM outage never breaks this screen (spec #24).
  const enriched = await Promise.all(markets.map(async (m) => {
    const route = logisticsOptions.find((l) => l.destination === m.name) || null;
    let distanceKm = m.distanceKm;
    let transportCostPerKg;

    if (route) {
      transportCostPerKg = route.costPerKg;
    } else {
      const resolved = farmerLocation ? await getFarmerToMarketDistanceKm(farmerLocation, m).catch(() => null) : null;
      if (resolved) {
        distanceKm = resolved.distanceKm;
        transportCostPerKg = Math.max(0.3, resolved.distanceKm * COST_PER_KM_PER_KG);
      } else {
        transportCostPerKg = estimateTransportCostPerKgFallback(m, farmerLocation);
      }
    }

    const breakdown = calculateNetRealization({ sellingPricePerKg: m.modalPrice, transportCostPerKg });
    return { ...m, distanceKm, transportCostPerKg, ...breakdown };
  }));

  let result = enriched;
  let sortedBy = 'netRealization';
  if (radiusKm) {
    // Distance-based discovery mode: real distance required to qualify —
    // a market we couldn't resolve a distance for can't be confirmed as
    // "within range", so it's excluded rather than guessed.
    result = enriched.filter((m) => m.distanceKm != null && m.distanceKm <= radiusKm);
    result.sort((a, b) => a.distanceKm - b.distanceKm);
    sortedBy = 'distance';
  } else {
    result = [...enriched].sort((a, b) => b.netRealization - a.netRealization);
  }

  res.json({ success: true, source, message, crop, markets: result, farmerLocation, radiusKm, sortedBy, farmerDriven });
});

// Last-resort fallback if a market can't be geocoded at all (or there's
// no farmerLocation to measure from) - keeps your original district/state
// tiering so the screen still shows something sensible.
function estimateTransportCostPerKgFallback(market, farmerLocation) {
  if (!farmerLocation) return 0.5;
  if (farmerLocation.district && market.district === farmerLocation.district) return 0.3;
  if (farmerLocation.state && market.state === farmerLocation.state) return 0.5;
  return 0.8;
}

// GET /api/markets/trends?crop=&market=&state=&district=&days=7|15|30
// Phase 2: real, dynamically-collected history — see priceTrendService
// for how the prediction is computed and why daysOfDataCollected matters.
// GET /api/markets/live-tiles?limit=12&crop=Tomato&lat=12.97&lng=77.59
// Phase 3: Live Mandi Tiles for the landing/role-selection page.
// Supports optional ?crop= filter (single crop) and ?lat= & ?lng= for
// geolocation-based nearby market discovery with distance calculation.
// When lat/lng provided, markets are sorted by distance ascending (nearest
// first) and distance is returned in each tile. Max 10 markets returned.
const TILE_COMMODITIES = ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton', 'Maize', 'Soybean'];

export const getLiveMandiTiles = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 24);
  const cropFilter = req.query.crop ? req.query.crop.trim() : null;
  const lat = req.query.lat != null && !Number.isNaN(Number(req.query.lat)) ? Number(req.query.lat) : null;
  const lng = req.query.lng != null && !Number.isNaN(Number(req.query.lng)) ? Number(req.query.lng) : null;
  const hasGeo = lat !== null && lng !== null;

  // If a specific crop is requested, only fetch that crop; otherwise fetch all commodities.
  const commoditiesToFetch = cropFilter ? [cropFilter] : TILE_COMMODITIES;
  const perCrop = cropFilter ? limit : Math.max(1, Math.ceil(limit / commoditiesToFetch.length));

  const results = await Promise.all(
    commoditiesToFetch.map((crop) => getMarketPrices({ crop }).catch(() => ({ markets: [], source: 'FALLBACK' }))),
  );

  const farmerLocation = hasGeo ? { lat, lng } : null;
  const logisticsOptions = await Logistics.find({}).lean();

  // Flatten all markets, then optionally enrich with distance
  let allMarkets = results.flatMap(({ markets }, i) =>
    markets.slice(0, perCrop).map((m) => ({
      ...m,
      fetchedCrop: commoditiesToFetch[i],
    })),
  );

  // If geo coords provided, calculate distance for each market
  if (hasGeo) {
    const enriched = await Promise.all(allMarkets.map(async (m) => {
      const route = logisticsOptions.find((l) => l.destination === m.name) || null;
      let distanceKm = m.distanceKm;

      if (!route) {
        const resolved = await getFarmerToMarketDistanceKm(farmerLocation, m).catch(() => null);
        if (resolved) {
          distanceKm = resolved.distanceKm;
        }
      }
      return { ...m, distanceKm };
    }));

    // Sort by distance when geo provided, filter out markets with no distance
    allMarkets = enriched
      .filter((m) => m.distanceKm != null)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    // Default: freshest first
    allMarkets.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  }

  const tiles = allMarkets.slice(0, limit).map((m) => ({
    crop: m.crop || m.fetchedCrop,
    market: m.name,
    state: m.state,
    district: m.district,
    minPrice: m.minPrice,
    maxPrice: m.maxPrice,
    modalPrice: m.modalPrice,
    trend: m.trend,
    lastUpdated: m.lastUpdated,
    distanceKm: m.distanceKm ?? null,
  }));

  res.json({
    success: true,
    tiles,
    generatedAt: new Date(),
    nearbyMode: hasGeo,
    farmerLocation: farmerLocation || null,
    availableCrops: TILE_COMMODITIES,
  });
});

export const getMarketTrends = asyncHandler(async (req, res) => {
  const { crop, market, state, district } = req.query;
  const days = [7, 15, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const result = await getPriceTrend({ crop, market, state, district, days });
  res.json({ success: true, ...result });
});

// GET /api/markets/activity?crop=&days=
// Phase 2: real market-reporting-activity metric (see
// marketActivityService for why this replaces arrival tonnage).
export const getMarketActivityIntelligence = asyncHandler(async (req, res) => {
  const { crop } = req.query;
  const days = [7, 15, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const result = await getMarketActivity({ crop, days });
  res.json({ success: true, ...result });
});

// GET /api/markets/intelligence?crop=&state=&district=&farmerId=
// Phase 2: "Commodity Intelligence" — highest/lowest price market (from
// the live snapshot), nearby markets (real road/geodesic distance from
// the farmer's location where one is known), and the real price
// prediction for the requested window.
export const getCommodityIntelligence = asyncHandler(async (req, res) => {
  const { farmerId } = req.query;
  let { crop, district, state } = req.query;

  // Same farmer-driven rule as listMarkets above: farmerId overrides
  // crop with the farmer's own registered crop and drops state/district
  // filtering entirely (nationwide). See the comment there for why.
  let farmerDriven = false;
  let farmerLocation = null;
  if (farmerId) {
    const farmer = await Farmer.findById(farmerId).lean();
    if (farmer) {
      crop = farmer.currentCrop?.crop || crop;
      farmerDriven = true;
      if (farmer.location) farmerLocation = farmer.location;
    }
  }

  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const effectiveState = farmerDriven ? undefined : (state || farmerLocation?.state);
  const effectiveDistrict = farmerDriven ? undefined : (district || farmerLocation?.district);

  const [{ markets, source, message }, trend30] = await Promise.all([
    getMarketPrices({ crop, state: effectiveState, district: effectiveDistrict }),
    getPriceTrend({ crop, state: effectiveState, district: effectiveDistrict, days: 30 }),
  ]);

  if (!markets.length) {
    return res.json({ success: true, source, crop, message: message || `No live market data for ${crop} yet.`, highestPriceMarket: null, lowestPriceMarket: null, nearbyMarkets: [], prediction: trend30.prediction });
  }

  const byPrice = [...markets].sort((a, b) => (b.modalPrice || 0) - (a.modalPrice || 0));
  const highestPriceMarket = byPrice[0];
  const lowestPriceMarket = byPrice[byPrice.length - 1];

  // Nearby markets: real distance when the farmer's location is known,
  // sorted nearest-first, capped to a reasonable list. If no location is
  // known, "nearby" degrades to same-district/state markets rather than
  // guessing coordinates.
  let nearbyMarkets = [];
  if (farmerLocation) {
    const withDistance = await Promise.all(markets.map(async (m) => {
      const resolved = await getFarmerToMarketDistanceKm(farmerLocation, m).catch(() => null);
      return { ...m, distanceKm: resolved?.distanceKm ?? null };
    }));
    nearbyMarkets = withDistance
      .filter((m) => m.distanceKm != null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);
  } else {
    nearbyMarkets = markets
      .filter((m) => m.district === effectiveDistrict || m.state === effectiveState)
      .slice(0, 8);
  }

  res.json({
    success: true,
    source,
    crop,
    message,
    highestPriceMarket,
    lowestPriceMarket,
    nearbyMarkets,
    prediction: trend30.prediction,
    daysOfDataCollected: trend30.daysOfDataCollected,
    farmerDriven,
  });
});

// GET /api/markets/history?crop=&market=&farmerId=&days=7
// Feature: Historical Market Data & Price Trend Charts. Reads the
// SEPARATE, pre-loaded historical dataset on MONGO_URI2 (see
// historicalMarketService.js) — distinct from the live-collected
// PriceHistory trend above (getMarketTrends). Same farmer-driven crop
// rule as listMarkets/getCommodityIntelligence: a farmerId overrides
// `crop` with the farmer's own registered crop.
export const getHistoricalMarketTrend = asyncHandler(async (req, res) => {
  const { farmerId, market } = req.query;
  let { crop } = req.query;
  const days = Number(req.query.days) > 0 ? Math.min(Number(req.query.days), 30) : 7;

  if (farmerId) {
    const farmer = await Farmer.findById(farmerId).lean();
    if (farmer) crop = farmer.currentCrop?.crop || crop;
  }

  if (!crop) return res.status(400).json({ success: false, message: 'crop is required (or pass farmerId)' });

  const result = await getHistoricalTrend({ crop, market, days });
  res.json({ success: true, crop, ...result });
});