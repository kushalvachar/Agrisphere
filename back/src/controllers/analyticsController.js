// controllers/analyticsController.js — Phase 11: Analytics Dashboard.
//
// Every number here is a live Mongo aggregation over real Transaction/Lot
// documents created through the app's own flows (Phase 5 auth →
// Phase 6 offers/transactions → Phase 8/9 logistics/payment). Nothing is
// pre-computed or seeded — a brand-new account correctly sees all-zero
// analytics until it has real transactions behind it.
import { asyncHandler } from '../middleware/asyncHandler.js';
import Transaction from '../models/Transaction.js';
import Lot from '../models/Lot.js';
import Buyer from '../models/Buyer.js';
import Storage from '../models/Storage.js';
import { getMarketPrices } from '../services/marketDataService.js';
import { geocodePlace } from '../services/geoService.js';

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/analytics/farmer?farmerName=
// Spec: "Revenue trends, Best selling markets, Historical prices" — the
// historical-prices piece is already covered by GET /api/markets/trends
// (Phase 2); this endpoint covers the transaction-derived pieces.
export const getFarmerAnalytics = asyncHandler(async (req, res) => {
  const { farmerName } = req.query;
  if (!farmerName) return res.status(400).json({ success: false, message: 'farmerName is required' });

  const transactions = await Transaction.find({ farmerName }).sort({ createdAt: 1 }).lean();

  const revenueByMonth = {};
  const byBuyer = {};
  const byCrop = {};
  for (const t of transactions) {
    const revenue = Math.round((t.quantityTonnes || 0) * 1000 * (t.agreedPricePerKg || 0));
    const key = monthKey(t.createdAt);
    revenueByMonth[key] = (revenueByMonth[key] || 0) + revenue;

    byBuyer[t.buyerName] = byBuyer[t.buyerName] || { buyerName: t.buyerName, totalRevenue: 0, transactionCount: 0 };
    byBuyer[t.buyerName].totalRevenue += revenue;
    byBuyer[t.buyerName].transactionCount += 1;

    byCrop[t.crop] = (byCrop[t.crop] || 0) + (t.quantityTonnes || 0);
  }

  const revenueTrend = Object.entries(revenueByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, revenue]) => ({ month, revenue }));
  const totalRevenue = revenueTrend.reduce((s, r) => s + r.revenue, 0);
  const avgNetRealization = transactions.length
    ? Math.round((transactions.reduce((s, t) => s + (t.netRealizationPerKg || 0), 0) / transactions.length) * 100) / 100
    : 0;
  const bestSellingMarkets = Object.values(byBuyer).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  res.json({
    success: true,
    transactionCount: transactions.length,
    totalRevenue,
    avgNetRealization,
    revenueTrend,
    bestSellingMarkets,
    cropBreakdown: Object.entries(byCrop).map(([crop, quantityTonnes]) => ({ crop, quantityTonnes })),
  });
});

// GET /api/analytics/buyer?buyerName=
// Spec: "Procurement analytics, Commodity trends" — commodity trends
// reuse GET /api/markets/trends (Phase 2); this covers procurement.
export const getBuyerAnalytics = asyncHandler(async (req, res) => {
  const { buyerName } = req.query;
  if (!buyerName) return res.status(400).json({ success: false, message: 'buyerName is required' });

  const transactions = await Transaction.find({ buyerName }).sort({ createdAt: 1 }).lean();

  const procurementByMonth = {};
  const byCrop = {};
  let totalSpend = 0;
  let totalQuantityTonnes = 0;
  for (const t of transactions) {
    const spend = Math.round((t.quantityTonnes || 0) * 1000 * (t.agreedPricePerKg || 0));
    const key = monthKey(t.createdAt);
    procurementByMonth[key] = procurementByMonth[key] || { month: key, quantityTonnes: 0, spend: 0 };
    procurementByMonth[key].quantityTonnes += t.quantityTonnes || 0;
    procurementByMonth[key].spend += spend;
    byCrop[t.crop] = (byCrop[t.crop] || 0) + (t.quantityTonnes || 0);
    totalSpend += spend;
    totalQuantityTonnes += t.quantityTonnes || 0;
  }

  const procurementTrend = Object.values(procurementByMonth).sort((a, b) => a.month.localeCompare(b.month));
  const avgPricePerKg = totalQuantityTonnes ? Math.round((totalSpend / (totalQuantityTonnes * 1000)) * 100) / 100 : 0;

  res.json({
    success: true,
    transactionCount: transactions.length,
    totalQuantityTonnes,
    totalSpend,
    avgPricePerKg,
    procurementTrend,
    cropBreakdown: Object.entries(byCrop).map(([crop, quantityTonnes]) => ({ crop, quantityTonnes })),
  });
});

// GET /api/analytics/fpo?crop=
// Spec: "Aggregated volume, Member insights".
// HONEST SCOPE NOTE: Lot records aren't currently scoped to a specific
// FPO account (pre-existing behavior from before Phase 5 — FPODashboard
// itself queries lots by crop only, not by FPO identity), so this
// aggregates across all lots for the given crop, same scope the FPO
// dashboard already uses, rather than silently inventing a narrower
// (and inconsistent) view.
export const getFpoAnalytics = asyncHandler(async (req, res) => {
  const { crop } = req.query;
  const query = crop ? { crop } : {};
  const lots = await Lot.find(query).sort({ createdAt: 1 }).lean();

  const memberTotals = {};
  for (const lot of lots) {
    for (const c of lot.contributions || []) {
      memberTotals[c.farmerName] = memberTotals[c.farmerName] || { farmerName: c.farmerName, totalQuantityTonnes: 0, lotCount: 0 };
      memberTotals[c.farmerName].totalQuantityTonnes += c.quantityTonnes || 0;
      memberTotals[c.farmerName].lotCount += 1;
    }
  }
  const memberInsights = Object.values(memberTotals).sort((a, b) => b.totalQuantityTonnes - a.totalQuantityTonnes);

  const volumeByMonth = {};
  for (const lot of lots) {
    const key = monthKey(lot.createdAt);
    volumeByMonth[key] = (volumeByMonth[key] || 0) + (lot.totalQuantityTonnes || 0);
  }
  const volumeTrend = Object.entries(volumeByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, quantityTonnes]) => ({ month, quantityTonnes }));

  res.json({
    success: true,
    lotCount: lots.length,
    totalVolumeTonnes: lots.reduce((s, l) => s + (l.totalQuantityTonnes || 0), 0),
    memberInsights,
    volumeTrend,
  });
});

// GET /api/analytics/opportunity-map?crop=
// Phase 12.5: Opportunity Map. Plots three REAL, live-sourced layers —
// demand hotspots (buyers currently seeking this crop, from the live
// Buyer collection), high-price markets (today's live data.gov.in
// prices, top by modalPrice), and nearby warehouses/cold storage
// (the facility directory) — each geocoded via the same
// Nominatim+GeoCache pipeline the rest of the app already uses for
// distance calculations, so coordinates are real place lookups, never
// invented. Capped per layer to keep geocoding latency reasonable.
export const getOpportunityMap = asyncHandler(async (req, res) => {
  const { crop } = req.query;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const [buyers, storageFacilities, { markets }] = await Promise.all([
    Buyer.find({ cropRequired: crop }).limit(8).lean(),
    Storage.find({}).limit(8).lean(),
    getMarketPrices({ crop }),
  ]);

  const topMarkets = [...markets].sort((a, b) => (b.modalPrice || 0) - (a.modalPrice || 0)).slice(0, 6);

  const geocodeAll = async (items, toQuery, toPoint) => {
    const results = await Promise.all(items.map(async (item) => {
      const coords = await geocodePlace(toQuery(item)).catch(() => null);
      if (!coords) return null;
      return { ...toPoint(item), lat: coords.lat, lng: coords.lng };
    }));
    return results.filter(Boolean);
  };

  const [demandHotspots, highPriceMarkets, nearbyWarehouses] = await Promise.all([
    geocodeAll(buyers, (b) => ({ name: b.location }), (b) => ({ label: b.name, offerPricePerKg: b.offerPricePerKg, quantityRequiredTonnes: b.quantityRequiredTonnes })),
    geocodeAll(topMarkets, (m) => ({ name: m.name, district: m.district, state: m.state }), (m) => ({ label: m.name, modalPrice: m.modalPrice, state: m.state })),
    geocodeAll(storageFacilities, (f) => ({ name: f.location }), (f) => ({ label: f.facilityName, capacityTonnes: f.capacityTonnes, type: f.type })),
  ]);

  res.json({ success: true, crop, demandHotspots, highPriceMarkets, nearbyWarehouses });
});
