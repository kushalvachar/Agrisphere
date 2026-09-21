// controllers/recommendationController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Buyer from '../models/Buyer.js';
import Storage from '../models/Storage.js';
import Logistics from '../models/Logistics.js';
import Farmer from '../models/Farmer.js';
import { getMarketPrices } from '../services/marketDataService.js';
import { calculateNetRealization, rankByNetRealization } from '../services/profitCalculator.js';
import { calculateRealTrustScore } from '../services/trustScoreService.js';
import { getSaleRecommendation } from '../services/geminiService.js';
import { getPriceTrend } from '../services/priceTrendService.js';
import { getFarmerToMarketDistanceKm, getRouteDistanceKm, geocodePlace } from '../services/geoService.js';

const COST_PER_KM_PER_KG = 0.02;

// POST /api/recommendation  { crop, quantityTonnes, grade, storageAvailable, farmerId | location }
export const generateRecommendation = asyncHandler(async (req, res) => {
  const { crop, quantityTonnes, grade, storageAvailable, farmerId, location, language } = req.body;
  if (!crop || !quantityTonnes) {
    return res.status(400).json({ success: false, message: 'crop and quantityTonnes are required' });
  }

  // location can be passed directly ({ state, district, village, lat, lng }),
  // or resolved from a saved farmerId - mirrors marketController's pattern.
  let farmerLocation = location || null;
  if (!farmerLocation && farmerId) {
    const farmer = await Farmer.findById(farmerId).lean();
    if (farmer?.location) farmerLocation = farmer.location;
  }

  const [{ markets }, buyers, storageFacilities, logisticsOptions] = await Promise.all([
    getMarketPrices({ crop }),
    Buyer.find({ cropRequired: crop }).lean(),
    Storage.find({}).lean(),
    Logistics.find({}).lean(),
  ]);

  // --- Rank markets by net realization (real road distance where possible) ---
  const marketOptions = await Promise.all(markets.map(async (m) => {
    const route = logisticsOptions.find((l) => l.destination === m.name);
    let transportCostPerKg;
    if (route) {
      transportCostPerKg = route.costPerKg;
    } else {
      const resolved = farmerLocation ? await getFarmerToMarketDistanceKm(farmerLocation, m).catch(() => null) : null;
      transportCostPerKg = resolved ? Math.max(0.3, resolved.distanceKm * COST_PER_KM_PER_KG) : 0.5;
    }
    return { label: m.name, type: 'market', sellingPricePerKg: m.modalPrice, transportCostPerKg };
  }));

  // --- Rank buyer offers by net realization ---
  const nearestStorage = storageFacilities.sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const buyerOptions = await Promise.all(buyers.map(async (b) => {
    const route = logisticsOptions.find((l) => l.destination === b.location);
    let transportCostPerKg;
    if (route) {
      transportCostPerKg = route.costPerKg;
    } else if (farmerLocation && b.location) {
      // Buyer locations are free-text (e.g. "Kolar Town") - geocode the
      // buyer side directly rather than reusing the market geocode path.
      const originCoords = farmerLocation.lat != null && farmerLocation.lng != null
        ? { lat: farmerLocation.lat, lng: farmerLocation.lng }
        : await geocodePlace({ name: farmerLocation.village, district: farmerLocation.district, state: farmerLocation.state }).catch(() => null);
      const destCoords = await geocodePlace({ name: b.location, state: farmerLocation.state }).catch(() => null);
      const resolved = originCoords && destCoords ? await getRouteDistanceKm(originCoords, destCoords).catch(() => null) : null;
      transportCostPerKg = resolved ? Math.max(0.3, resolved.distanceKm * COST_PER_KM_PER_KG) : Math.max(0.3, (b.distanceKm || 10) * 0.02);
    } else {
      transportCostPerKg = Math.max(0.3, (b.distanceKm || 10) * 0.02);
    }
    return { label: b.name, type: 'buyer', sellingPricePerKg: b.offerPricePerKg, transportCostPerKg, buyerRef: b };
  }));

  const allOptions = rankByNetRealization([...marketOptions, ...buyerOptions]);
  const best = allOptions[0];

  if (!best) {
    return res.json({ success: true, message: `No market or buyer data available for ${crop} yet.` });
  }

  const trend = markets[0]?.trend || 'stable';
  // Phase 2: "best selling window" — grounded in real, dynamically
  // collected multi-day history rather than the single live-fetch
  // snapshot trend above. Falls back gracefully (insufficient_data)
  // for a crop that has just started being tracked.
  const { prediction: priceTrend30d, daysOfDataCollected } = await getPriceTrend({ crop, days: 30 });

  const aiInput = {
    crop,
    quantityTonnes,
    grade,
    bestOption: best.label,
    bestNetRealization: best.breakdown.netRealization,
    trend,
    priceTrend30Days: priceTrend30d,
    daysOfRealHistoryAvailable: daysOfDataCollected,
    storageAvailable: !!storageAvailable,
    storageCostPerKgPerDay: nearestStorage?.costPerKgPerDay ?? 0.5,
    topAlternatives: allOptions.slice(1, 3).map((o) => ({ label: o.label, netRealization: o.breakdown.netRealization })),
  };
  const aiRecommendation = await getSaleRecommendation(aiInput, language || 'English');

  const bestBuyerTrust = best.buyerRef ? await calculateRealTrustScore(best.buyerRef) : null;

  res.json({
    success: true,
    bestOption: { label: best.label, type: best.type, breakdown: best.breakdown, trust: bestBuyerTrust },
    allOptions: allOptions.map((o) => ({ label: o.label, type: o.type, breakdown: o.breakdown })),
    logistics: logisticsOptions.find((l) => l.destination === best.label) || null,
    storage: nearestStorage || null,
    priceTrend30Days: priceTrend30d,
    daysOfRealHistoryAvailable: daysOfDataCollected,
    aiRecommendation,
    disclaimer: 'AI-assisted recommendation. Prices are indicative and not guaranteed.',
  });
});