// seed/seedData.js
//
// Synthetic/demo data for the prototype. NONE of this is official
// AGMARKNET data — it is illustrative, clearly-labeled demo data used
// so the hackathon demo works offline and reliably (spec sections 17-18).
export const demoFarmer = {
  name: 'Ramesh Kumar',
  location: { village: 'Kolar Town', district: 'Kolar', state: 'Karnataka', lat: 13.1367, lng: 78.1298 },
  phone: '+91-90000-00000',
  currentCrop: { crop: 'Tomato', quantityTonnes: 10, grade: 'A', storageAvailable: true },
};

// Additional standalone farmers (not the logged-in demo farmer) so the
// Buyer role's "Find Produce" search has real individual-farmer produce
// to discover, not just FPO Smart Lots. These farmers have no dashboard
// of their own in this prototype — offers made against them are still
// correctly attributed to their name in the Offer/Transaction records,
// they simply aren't visible in any role's UI (there's only one Farmer
// login: Ramesh Kumar).
export const additionalFarmers = [
  {
    name: 'Lakshmi Devi',
    location: { village: 'Srinivaspur', district: 'Kolar', state: 'Karnataka', lat: 13.32, lng: 78.21 },
    phone: '+91-90000-00001',
    currentCrop: { crop: 'Onion', quantityTonnes: 8, grade: 'A', storageAvailable: false },
  },
  {
    name: 'Suresh Gowda',
    location: { village: 'Malavalli', district: 'Mandya', state: 'Karnataka', lat: 12.38, lng: 77.07 },
    phone: '+91-90000-00002',
    currentCrop: { crop: 'Paddy', quantityTonnes: 15, grade: 'B', storageAvailable: true },
  },
  {
    name: 'Manjunath H.',
    location: { village: 'Chintamani', district: 'Chikkaballapur', state: 'Karnataka', lat: 13.4, lng: 78.06 },
    phone: '+91-90000-00003',
    currentCrop: { crop: 'Tomato', quantityTonnes: 6, grade: 'B', storageAvailable: false },
  },
];

// `channel` distinguishes physical APMC mandis from eNAM electronic-trading
// listings — Feature 5 (Multi-Channel Market Comparison) ranks both
// alongside buyer channels in one comparison.
export const markets = [
  { name: 'Kolar APMC', channel: 'APMC', state: 'Karnataka', district: 'Kolar', crop: 'Tomato', distanceKm: 5, minPrice: 17, modalPrice: 20, maxPrice: 22, arrivalQuantityTonnes: 220, trend: 'stable' },
  { name: 'Bengaluru Yeshwanthpur APMC', channel: 'APMC', state: 'Karnataka', district: 'Bengaluru Urban', crop: 'Tomato', distanceKm: 70, minPrice: 20, modalPrice: 23, maxPrice: 26, arrivalQuantityTonnes: 540, trend: 'up' },
  { name: 'Tumakuru APMC', channel: 'APMC', state: 'Karnataka', district: 'Tumakuru', crop: 'Tomato', distanceKm: 90, minPrice: 18, modalPrice: 21, maxPrice: 23, arrivalQuantityTonnes: 160, trend: 'stable' },
  { name: 'Chintamani APMC', channel: 'APMC', state: 'Karnataka', district: 'Chikkaballapur', crop: 'Tomato', distanceKm: 40, minPrice: 17.5, modalPrice: 20.5, maxPrice: 22.5, arrivalQuantityTonnes: 130, trend: 'down' },
  { name: 'Mysuru APMC', channel: 'APMC', state: 'Karnataka', district: 'Mysuru', crop: 'Onion', distanceKm: 140, minPrice: 12, modalPrice: 15, maxPrice: 17, arrivalQuantityTonnes: 300, trend: 'up' },
  { name: 'Hubballi APMC', channel: 'APMC', state: 'Karnataka', district: 'Dharwad', crop: 'Onion', distanceKm: 410, minPrice: 11, modalPrice: 14, maxPrice: 16, arrivalQuantityTonnes: 380, trend: 'stable' },
  { name: 'Belagavi APMC', channel: 'APMC', state: 'Karnataka', district: 'Belagavi', crop: 'Potato', distanceKm: 500, minPrice: 9, modalPrice: 11, maxPrice: 13, arrivalQuantityTonnes: 260, trend: 'stable' },
  { name: 'Kolar Potato Yard', channel: 'APMC', state: 'Karnataka', district: 'Kolar', crop: 'Potato', distanceKm: 5, minPrice: 8.5, modalPrice: 10.5, maxPrice: 12, arrivalQuantityTonnes: 90, trend: 'down' },
  { name: 'Raichur APMC', channel: 'APMC', state: 'Karnataka', district: 'Raichur', crop: 'Paddy', distanceKm: 350, minPrice: 19, modalPrice: 21, maxPrice: 23, arrivalQuantityTonnes: 610, trend: 'up' },
  { name: 'Mandya APMC', channel: 'APMC', state: 'Karnataka', district: 'Mandya', crop: 'Paddy', distanceKm: 100, minPrice: 18.5, modalPrice: 20.5, maxPrice: 22, arrivalQuantityTonnes: 420, trend: 'stable' },
  { name: 'Chikkamagaluru APMC', channel: 'APMC', state: 'Karnataka', district: 'Chikkamagaluru', crop: 'Tomato', distanceKm: 220, minPrice: 18, modalPrice: 21.5, maxPrice: 24, arrivalQuantityTonnes: 100, trend: 'up' },
  { name: 'Anantapur APMC', channel: 'APMC', state: 'Andhra Pradesh', district: 'Anantapur', crop: 'Tomato', distanceKm: 130, minPrice: 17, modalPrice: 19.5, maxPrice: 21, arrivalQuantityTonnes: 190, trend: 'stable' },
  // eNAM electronic-trading listings (Feature 5) — same crop, different channel/price discovery mechanism
  { name: 'eNAM Kolar', channel: 'eNAM', state: 'Karnataka', district: 'Kolar', crop: 'Tomato', distanceKm: 5, minPrice: 18, modalPrice: 21.5, maxPrice: 23.5, arrivalQuantityTonnes: 95, trend: 'up' },
  { name: 'eNAM Mysuru', channel: 'eNAM', state: 'Karnataka', district: 'Mysuru', crop: 'Onion', distanceKm: 140, minPrice: 13, modalPrice: 15.8, maxPrice: 17.5, arrivalQuantityTonnes: 110, trend: 'up' },
  { name: 'eNAM Mandya', channel: 'eNAM', state: 'Karnataka', district: 'Mandya', crop: 'Paddy', distanceKm: 100, minPrice: 19, modalPrice: 21.2, maxPrice: 22.8, arrivalQuantityTonnes: 200, trend: 'stable' },
];

// `buyerType` + `channel` + `requirements` power Feature 4 (Institutional
// Buyer Integration): processors, retail chains, exporters, and government
// procurement agencies each carry realistic quantity/quality/delivery
// requirements, alongside the original plain traders/aggregators.
// NOTE: the first entry, 'ABC Foods (Demo)', is the buyer account the
// "Try Demo Buyer Account" button on the login page signs into (see
// seed.js, which attaches the User/password to this exact document by
// name) — keep its `name` unchanged if you edit this list.
export const buyers = [
  { name: 'ABC Foods (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Tomato', gradeRequired: 'A', quantityRequiredTonnes: 20, offerPricePerKg: 24, location: 'Bengaluru', distanceKm: 70, requiredByDate: daysFromNow(4), verified: true, paymentReliabilityPct: 95, completedTransactions: 42, disputedTransactionsPct: 2 },
  { name: 'FreshMart Aggregators (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Tomato', gradeRequired: 'A', quantityRequiredTonnes: 8, offerPricePerKg: 22.5, location: 'Kolar', distanceKm: 6, requiredByDate: daysFromNow(2), verified: true, paymentReliabilityPct: 88, completedTransactions: 25, disputedTransactionsPct: 5 },
  { name: 'City Wholesale Traders (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Tomato', gradeRequired: 'B', quantityRequiredTonnes: 15, offerPricePerKg: 21, location: 'Tumakuru', distanceKm: 90, requiredByDate: daysFromNow(7), verified: true, paymentReliabilityPct: 80, completedTransactions: 18, disputedTransactionsPct: 8 },
  { name: 'GreenLeaf Exports (Demo)', buyerType: 'Exporter', channel: 'Exporter', cropRequired: 'Tomato', gradeRequired: 'A', quantityRequiredTonnes: 30, offerPricePerKg: 25, location: 'Bengaluru', distanceKm: 72, requiredByDate: daysFromNow(10), verified: true, paymentReliabilityPct: 91, completedTransactions: 60, disputedTransactionsPct: 3,
    requirements: { qualitySpec: 'Grade A only, uniform size 60-80mm, <3% blemish', deliverySchedule: 'Fortnightly export container loading', packagingRequirement: '10kg export cartons, ventilated', contractType: 'Forward Agreement' } },
  { name: 'Karnataka Cold Chain Co. (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Onion', gradeRequired: 'A', quantityRequiredTonnes: 25, offerPricePerKg: 16, location: 'Mysuru', distanceKm: 140, requiredByDate: daysFromNow(5), verified: true, paymentReliabilityPct: 85, completedTransactions: 30, disputedTransactionsPct: 4 },
  { name: 'Deccan Agro Buyers (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Potato', gradeRequired: 'B', quantityRequiredTonnes: 12, offerPricePerKg: 11.5, location: 'Kolar', distanceKm: 5, requiredByDate: daysFromNow(3), verified: false, paymentReliabilityPct: 65, completedTransactions: 6, disputedTransactionsPct: 15 },
  { name: 'Namma Mandi Retail (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Tomato', gradeRequired: 'C', quantityRequiredTonnes: 5, offerPricePerKg: 18, location: 'Kolar', distanceKm: 4, requiredByDate: daysFromNow(1), verified: true, paymentReliabilityPct: 70, completedTransactions: 10, disputedTransactionsPct: 10 },
  { name: 'Southern Paddy Millers (Demo)', buyerType: 'Processor', channel: 'Processor', cropRequired: 'Paddy', gradeRequired: 'A', quantityRequiredTonnes: 50, offerPricePerKg: 22, location: 'Mandya', distanceKm: 100, requiredByDate: daysFromNow(12), verified: true, paymentReliabilityPct: 93, completedTransactions: 70, disputedTransactionsPct: 2,
    requirements: { qualitySpec: 'Grade A, moisture content <14%', deliverySchedule: 'Monthly bulk intake, silo slots pre-booked', packagingRequirement: 'Bulk/loose, mill-side weighbridge', contractType: 'Seasonal Contract' } },
  { name: 'FarmFresh Direct (Demo)', buyerType: 'Trader/Aggregator', channel: 'Direct Trader', cropRequired: 'Tomato', gradeRequired: 'A', quantityRequiredTonnes: 10, offerPricePerKg: 23.5, location: 'Chintamani', distanceKm: 40, requiredByDate: daysFromNow(6), verified: true, paymentReliabilityPct: 89, completedTransactions: 20, disputedTransactionsPct: 6 },
  // --- Institutional buyers (Feature 4) ---
  { name: 'PureHarvest Foods Processing (Demo)', buyerType: 'Processor', channel: 'Processor', cropRequired: 'Tomato', gradeRequired: 'B', quantityRequiredTonnes: 40, offerPricePerKg: 20.5, location: 'Tumakuru', distanceKm: 90, requiredByDate: daysFromNow(8), verified: true, paymentReliabilityPct: 90, completedTransactions: 55, disputedTransactionsPct: 3,
    requirements: { qualitySpec: 'Grade B/A accepted, ripe for paste processing, <10% split fruit', deliverySchedule: 'Twice weekly during peak season', packagingRequirement: 'Bulk crates, factory-gate delivery', contractType: 'Seasonal Contract' } },
  { name: 'MetroFresh Retail Chain (Demo)', buyerType: 'Retail Chain', channel: 'Retail Chain', cropRequired: 'Tomato', gradeRequired: 'A', quantityRequiredTonnes: 12, offerPricePerKg: 23, location: 'Bengaluru', distanceKm: 70, requiredByDate: daysFromNow(3), verified: true, paymentReliabilityPct: 94, completedTransactions: 80, disputedTransactionsPct: 2,
    requirements: { qualitySpec: 'Grade A, retail-shelf appearance, uniform ripeness', deliverySchedule: 'Daily store replenishment, early morning slots', packagingRequirement: '5kg retail-ready crates with labels', contractType: 'Spot' } },
  { name: 'Karnataka State Procurement Agency (Demo)', buyerType: 'Government Agency', channel: 'Government Procurement', cropRequired: 'Paddy', gradeRequired: 'A', quantityRequiredTonnes: 100, offerPricePerKg: 21, location: 'Mandya', distanceKm: 100, requiredByDate: daysFromNow(20), verified: true, paymentReliabilityPct: 97, completedTransactions: 200, disputedTransactionsPct: 1,
    requirements: { qualitySpec: 'FAQ (Fair Average Quality) as per MSP norms', deliverySchedule: 'Procurement window per government schedule', packagingRequirement: 'Standard gunny bags, 50kg', contractType: 'MSP Procurement' } },
  { name: 'Global Agri Exports Ltd (Demo)', buyerType: 'Exporter', channel: 'Exporter', cropRequired: 'Onion', gradeRequired: 'A', quantityRequiredTonnes: 35, offerPricePerKg: 17, location: 'Mysuru', distanceKm: 140, requiredByDate: daysFromNow(9), verified: true, paymentReliabilityPct: 92, completedTransactions: 48, disputedTransactionsPct: 3,
    requirements: { qualitySpec: 'Grade A, export-size grading, <2% rot', deliverySchedule: 'Container-load fortnightly', packagingRequirement: 'Mesh export bags, 25kg', contractType: 'Forward Agreement' } },
  { name: 'AgriMart Digital Marketplace (Demo)', buyerType: 'Trader/Aggregator', channel: 'Digital Marketplace', cropRequired: 'Tomato', gradeRequired: 'B', quantityRequiredTonnes: 6, offerPricePerKg: 22, location: 'Kolar', distanceKm: 8, requiredByDate: daysFromNow(2), verified: true, paymentReliabilityPct: 82, completedTransactions: 15, disputedTransactionsPct: 6,
    requirements: { qualitySpec: 'Grade B/A, photo-verified listing', deliverySchedule: 'On-demand pickup after online bid acceptance', packagingRequirement: 'Standard crates', contractType: 'Spot (online bidding)' } },
];

export const storageFacilities = [
  { facilityName: 'Kolar Cold Storage', location: 'Kolar', type: 'Cold Storage', capacityTonnes: 200, availableCapacityTonnes: 20, costPerKgPerDay: 0.6, distanceKm: 5.2 },
  { facilityName: 'Bengaluru AgriWarehouse', location: 'Bengaluru', type: 'Cold Storage', capacityTonnes: 500, availableCapacityTonnes: 80, costPerKgPerDay: 0.75, distanceKm: 70 },
  { facilityName: 'Tumakuru Warehousing Corp.', location: 'Tumakuru', type: 'Dry Warehouse', capacityTonnes: 350, availableCapacityTonnes: 40, costPerKgPerDay: 0.4, distanceKm: 90 },
  { facilityName: 'Chintamani Farmer Storage', location: 'Chintamani', type: 'Cold Storage', capacityTonnes: 100, availableCapacityTonnes: 15, costPerKgPerDay: 0.55, distanceKm: 40 },
  { facilityName: 'Mandya Grain Silo', location: 'Mandya', type: 'Silo', capacityTonnes: 800, availableCapacityTonnes: 200, costPerKgPerDay: 0.25, distanceKm: 100 },
  { facilityName: 'Mysuru Cold Hub', location: 'Mysuru', type: 'Cold Storage', capacityTonnes: 400, availableCapacityTonnes: 60, costPerKgPerDay: 0.65, distanceKm: 140 },
];

export const logisticsOptions = [
  { source: 'Kolar', destination: 'Kolar APMC', distanceKm: 5, vehicleType: 'Mini Truck', costPerKg: 0.15, etaHoursMin: 0.5, etaHoursMax: 1 },
  { source: 'Kolar', destination: 'Bengaluru Yeshwanthpur APMC', distanceKm: 70, vehicleType: 'Mini Truck', costPerKg: 1.4, etaHoursMin: 2, etaHoursMax: 3 },
  { source: 'Kolar', destination: 'ABC Foods (Demo)', distanceKm: 70, vehicleType: 'Mini Truck', costPerKg: 1.8, etaHoursMin: 4, etaHoursMax: 5 },
  { source: 'Kolar', destination: 'Tumakuru APMC', distanceKm: 90, vehicleType: 'Truck (7T)', costPerKg: 1.2, etaHoursMin: 3, etaHoursMax: 4 },
  { source: 'Kolar', destination: 'City Wholesale Traders (Demo)', distanceKm: 90, vehicleType: 'Truck (7T)', costPerKg: 1.25, etaHoursMin: 3, etaHoursMax: 4 },
  { source: 'Kolar', destination: 'Chintamani APMC', distanceKm: 40, vehicleType: 'Mini Truck', costPerKg: 0.9, etaHoursMin: 1.5, etaHoursMax: 2 },
  { source: 'Kolar', destination: 'FarmFresh Direct (Demo)', distanceKm: 40, vehicleType: 'Mini Truck', costPerKg: 0.95, etaHoursMin: 1.5, etaHoursMax: 2 },
  { source: 'Kolar', destination: 'FreshMart Aggregators (Demo)', distanceKm: 6, vehicleType: 'Mini Truck', costPerKg: 0.2, etaHoursMin: 0.5, etaHoursMax: 1 },
  { source: 'Kolar', destination: 'GreenLeaf Exports (Demo)', distanceKm: 72, vehicleType: 'Refrigerated Van', costPerKg: 2.1, etaHoursMin: 3, etaHoursMax: 4 },
  { source: 'Kolar', destination: 'PureHarvest Foods Processing (Demo)', distanceKm: 90, vehicleType: 'Truck (7T)', costPerKg: 1.3, etaHoursMin: 3, etaHoursMax: 4 },
  { source: 'Kolar', destination: 'MetroFresh Retail Chain (Demo)', distanceKm: 70, vehicleType: 'Refrigerated Van', costPerKg: 1.9, etaHoursMin: 2, etaHoursMax: 3 },
  { source: 'Kolar', destination: 'eNAM Kolar', distanceKm: 5, vehicleType: 'Mini Truck', costPerKg: 0.18, etaHoursMin: 0.5, etaHoursMax: 1 },
];

// 60 days of synthetic price history for each crop/market pair
export function generatePriceHistory() {
  const crops = [
    { crop: 'Tomato', market: 'Kolar APMC', base: 19, volatility: 1.5 },
    { crop: 'Tomato', market: 'Bengaluru Yeshwanthpur APMC', base: 21, volatility: 2 },
    { crop: 'Onion', market: 'Mysuru APMC', base: 14, volatility: 1 },
    { crop: 'Potato', market: 'Kolar Potato Yard', base: 10, volatility: 0.8 },
    { crop: 'Paddy', market: 'Mandya APMC', base: 20, volatility: 0.6 },
  ];
  return randomWalkSeries(crops, 60, 'modalPrice');
}

// Feature 1 (Arrival Volume Intelligence): 60 days of synthetic daily
// arrival tonnage per crop/market — deliberately correlated so Kolar
// Tomato shows a visible "arrivals up, price down" pattern for the demo.
export function generateArrivalVolumeHistory() {
  const crops = [
    { crop: 'Tomato', market: 'Kolar APMC', base: 20, volatility: 6 },
    { crop: 'Tomato', market: 'Bengaluru Yeshwanthpur APMC', base: 45, volatility: 10 },
    { crop: 'Onion', market: 'Mysuru APMC', base: 30, volatility: 8 },
    { crop: 'Potato', market: 'Kolar Potato Yard', base: 15, volatility: 4 },
    { crop: 'Paddy', market: 'Mandya APMC', base: 55, volatility: 12 },
  ];
  return randomWalkSeries(crops, 60, 'arrivalQuantityTonnes');
}

// Feature 2 (Buyer Demand Forecasting): 12 months of synthetic monthly
// procurement quantities per buyer/crop, with a mild seasonal pattern
// (higher procurement Oct-Feb, the main harvest window) that the
// deterministic forecaster in demandForecastService.js can pick up on.
export function generateProcurementHistory() {
  const buyerCropPairs = [
    { buyerName: 'ABC Foods (Demo)', crop: 'Tomato', base: 18 },
    { buyerName: 'GreenLeaf Exports (Demo)', crop: 'Tomato', base: 26 },
    { buyerName: 'PureHarvest Foods Processing (Demo)', crop: 'Tomato', base: 34 },
    { buyerName: 'MetroFresh Retail Chain (Demo)', crop: 'Tomato', base: 10 },
    { buyerName: 'Southern Paddy Millers (Demo)', crop: 'Paddy', base: 44 },
    { buyerName: 'Karnataka State Procurement Agency (Demo)', crop: 'Paddy', base: 85 },
  ];
  // simple seasonal multiplier by month (1=Jan ... 12=Dec) — harvest-season bump
  const seasonalMultiplier = { 1: 1.2, 2: 1.15, 3: 1.0, 4: 0.85, 5: 0.8, 6: 0.8, 7: 0.85, 8: 0.9, 9: 0.95, 10: 1.2, 11: 1.3, 12: 1.25 };

  const records = [];
  const now = new Date();
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    buyerCropPairs.forEach(({ buyerName, crop, base }) => {
      const noise = (Math.random() - 0.5) * base * 0.15;
      const quantityProcuredTonnes = Math.max(1, Math.round((base * seasonalMultiplier[month] + noise) * 100) / 100);
      records.push({ buyerName, crop, month, year, quantityProcuredTonnes });
    });
  }
  return records;
}

/** Shared random-walk generator used for both price and arrival-volume series. */
function randomWalkSeries(series, days, valueKey) {
  const records = [];
  const today = new Date();
  series.forEach(({ crop, market, base, volatility }) => {
    let value = base;
    for (let i = days; i >= 0; i--) {
      const drift = 0.01;
      const noise = (Math.random() - 0.5) * volatility;
      value = Math.max(base * 0.6, Math.min(base * 1.5, value + drift + noise));
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      records.push({ crop, market, date, [valueKey]: Math.round(value * 100) / 100 });
    }
  });
  return records;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ---------------------------------------------------------------------
// Task 4 — Advanced Seed Data (scale-up generators).
//
// The curated arrays above (additionalFarmers: 3, buyers: 14, markets: 15)
// stay exactly as they were — Offer/Transaction/demo-flow code references
// those exact names ('ABC Foods (Demo)', 'Kolar APMC', etc.) so they must
// keep existing. These generators produce the EXTRA farmers/FPOs/buyers/
// markets needed to reach the spec's minimums (50+/20+/40+/100+), built
// deterministically from small template pools rather than hand-typed —
// still clearly-labeled synthetic demo data, never presented as real
// AGMARKNET/eNAM records.
// ---------------------------------------------------------------------

export const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Maize', 'Cotton', 'Soybean'];

// Base price (₹/kg) + volatility used both for live Market rows and for
// the 365-day MONGO_URI2 historical generator, so the two datasets stay
// in the same ballpark for a given crop.
export const CROP_PRICE_BASE = {
  Tomato: { base: 20, volatility: 3 },
  Onion: { base: 15, volatility: 2.5 },
  Potato: { base: 11, volatility: 1.5 },
  Paddy: { base: 21, volatility: 1 },
  Wheat: { base: 23, volatility: 1.2 },
  Maize: { base: 18, volatility: 1.8 },
  Cotton: { base: 62, volatility: 4 },
  Soybean: { base: 41, volatility: 2.2 },
};

// 20 market towns across the states these crops are actually grown in
// (Karnataka/AP for the original demo crops, plus Maharashtra/Punjab/UP
// so Cotton/Soybean/Wheat have a realistic home state too).
const MARKET_TOWNS = [
  { name: 'Kolar', state: 'Karnataka', district: 'Kolar', distanceKm: 5 },
  { name: 'Bengaluru Yeshwanthpur', state: 'Karnataka', district: 'Bengaluru Urban', distanceKm: 70 },
  { name: 'Tumakuru', state: 'Karnataka', district: 'Tumakuru', distanceKm: 90 },
  { name: 'Chintamani', state: 'Karnataka', district: 'Chikkaballapur', distanceKm: 40 },
  { name: 'Mysuru', state: 'Karnataka', district: 'Mysuru', distanceKm: 140 },
  { name: 'Hubballi', state: 'Karnataka', district: 'Dharwad', distanceKm: 410 },
  { name: 'Belagavi', state: 'Karnataka', district: 'Belagavi', distanceKm: 500 },
  { name: 'Raichur', state: 'Karnataka', district: 'Raichur', distanceKm: 350 },
  { name: 'Mandya', state: 'Karnataka', district: 'Mandya', distanceKm: 100 },
  { name: 'Chikkamagaluru', state: 'Karnataka', district: 'Chikkamagaluru', distanceKm: 220 },
  { name: 'Anantapur', state: 'Andhra Pradesh', district: 'Anantapur', distanceKm: 130 },
  { name: 'Kurnool', state: 'Andhra Pradesh', district: 'Kurnool', distanceKm: 260 },
  { name: 'Guntur', state: 'Andhra Pradesh', district: 'Guntur', distanceKm: 480 },
  { name: 'Nashik', state: 'Maharashtra', district: 'Nashik', distanceKm: 620 },
  { name: 'Akola', state: 'Maharashtra', district: 'Akola', distanceKm: 700 },
  { name: 'Nagpur', state: 'Maharashtra', district: 'Nagpur', distanceKm: 780 },
  { name: 'Ludhiana', state: 'Punjab', district: 'Ludhiana', distanceKm: 1900 },
  { name: 'Amritsar', state: 'Punjab', district: 'Amritsar', distanceKm: 2000 },
  { name: 'Meerut', state: 'Uttar Pradesh', district: 'Meerut', distanceKm: 1750 },
  { name: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', distanceKm: 1900 },
];

// Which crops actually get traded at which town — keeps the generated
// Market rows agronomically plausible (no Cotton yard in Kolar, no
// Wheat mandi in coastal Andhra) instead of a fully random cross-join.
const TOWN_CROPS = {
  Kolar: ['Tomato', 'Potato', 'Maize'],
  'Bengaluru Yeshwanthpur': ['Tomato', 'Onion', 'Maize'],
  Tumakuru: ['Tomato', 'Onion', 'Maize'],
  Chintamani: ['Tomato', 'Potato'],
  Mysuru: ['Onion', 'Paddy', 'Maize'],
  Hubballi: ['Onion', 'Cotton', 'Maize'],
  Belagavi: ['Potato', 'Cotton', 'Soybean'],
  Raichur: ['Paddy', 'Cotton'],
  Mandya: ['Paddy', 'Maize'],
  Chikkamagaluru: ['Tomato', 'Maize'],
  Anantapur: ['Tomato', 'Onion', 'Cotton'],
  Kurnool: ['Paddy', 'Cotton', 'Maize'],
  Guntur: ['Cotton', 'Paddy', 'Maize'],
  Nashik: ['Onion', 'Tomato', 'Soybean'],
  Akola: ['Cotton', 'Soybean', 'Wheat'],
  Nagpur: ['Cotton', 'Soybean', 'Paddy'],
  Ludhiana: ['Wheat', 'Paddy', 'Maize'],
  Amritsar: ['Wheat', 'Paddy'],
  Meerut: ['Wheat', 'Paddy', 'Potato'],
  Lucknow: ['Wheat', 'Potato', 'Maize'],
};

// Deterministic-but-varied pseudo-random helper (no seeded RNG library
// needed) — spreads values across a range using a simple index-based
// offset so re-running the seed script produces the same *shape* of
// data (stable demo), while still looking realistic (no exact repeats).
function spread(index, range) {
  return ((Math.sin(index * 12.9898) * 43758.5453) % 1 + 1) % 1 * range;
}

/** EXTRA markets (on top of the 15 curated ones above) — APMC in every
 * town for each of its assigned crops, plus an eNAM listing for roughly
 * half of those, comfortably clearing the 100+ markets requirement. */
export function generateMoreMarkets() {
  const extra = [];
  let i = 0;
  for (const town of MARKET_TOWNS) {
    const crops = TOWN_CROPS[town.name] || [];
    for (const crop of crops) {
      const { base, volatility } = CROP_PRICE_BASE[crop];
      i += 1;
      const drift = spread(i, volatility * 2) - volatility;
      const modalPrice = Math.round((base + drift) * 100) / 100;
      const spreadPct = 0.08 + spread(i + 1, 0.05);
      const minPrice = Math.round(modalPrice * (1 - spreadPct) * 100) / 100;
      const maxPrice = Math.round(modalPrice * (1 + spreadPct) * 100) / 100;
      const trend = ['up', 'down', 'stable'][i % 3];
      const arrivalQuantityTonnes = Math.round(60 + spread(i + 2, 400));

      extra.push({
        name: `${town.name} APMC`, channel: 'APMC', state: town.state, district: town.district,
        crop, distanceKm: town.distanceKm, minPrice, modalPrice, maxPrice, arrivalQuantityTonnes, trend,
      });

      // eNAM listing for two out of every three town/crop pairs — same
      // crop, its own (slightly different) electronic-trading price
      // discovery. (Higher hit-rate than "every other" so the combined
      // market count comfortably clears the 100+ requirement.)
      if (i % 3 !== 0) {
        const enamModal = Math.round(modalPrice * (1 + (spread(i + 3, 0.06) - 0.03)) * 100) / 100;
        extra.push({
          name: `eNAM ${town.name}`, channel: 'eNAM', state: town.state, district: town.district,
          crop, distanceKm: town.distanceKm,
          minPrice: Math.round(enamModal * 0.92 * 100) / 100,
          modalPrice: enamModal,
          maxPrice: Math.round(enamModal * 1.08 * 100) / 100,
          arrivalQuantityTonnes: Math.round(arrivalQuantityTonnes * 0.4),
          trend: ['up', 'down', 'stable'][(i + 1) % 3],
        });
      }
    }
  }
  return extra; // combined with the 15 curated markets, comfortably clears the 100+ requirement
}

const VILLAGE_POOL = [
  'Srinivaspur', 'Malavalli', 'Gauribidanur', 'Sidlaghatta', 'Bagepalli', 'Bethamangala',
  'Mulbagal', 'Vemgal', 'Krishnarajpet', 'Pandavapura', 'Nanjangud', 'Hunsur', 'Periyapatna',
  'Sagara', 'Sirsi', 'Kundapura', 'Puttur', 'Sullia', 'Madhugiri', 'Koratagere', 'Sira',
  'Pavagada', 'Hiriyur', 'Challakere', 'Molakalmuru', 'Rayadurg', 'Kadiri', 'Madanapalle',
  'Puttaparthi', 'Hindupur', 'Yellandu', 'Bhainsa', 'Adilabad', 'Amravati', 'Yavatmal',
  'Wardha', 'Buldhana', 'Jalgaon', 'Malegaon', 'Sangamner', 'Moga', 'Jalandhar', 'Patiala',
  'Bathinda', 'Muzaffarnagar', 'Saharanpur', 'Bareilly', 'Sitapur', 'Barabanki', 'Hardoi',
];

const FIRST_NAMES = ['Ramesh', 'Suresh', 'Manjunath', 'Lakshmi', 'Krishna', 'Venkatesh', 'Puttaraju',
  'Chandrappa', 'Basavaraj', 'Nagaraj', 'Shivakumar', 'Gopal', 'Ravindra', 'Mahadevi', 'Yashoda',
  'Girish', 'Prakash', 'Anitha', 'Kavitha', 'Sunil', 'Vijay', 'Rajesh', 'Deepak', 'Meena', 'Radha',
  'Harpreet', 'Gurpreet', 'Balwinder', 'Rajinder', 'Amrik', 'Ramkishan', 'Sanjay', 'Vinod'];
const LAST_NAMES = ['Kumar', 'Gowda', 'Reddy', 'Devi', 'Naidu', 'Patil', 'Rao', 'Singh', 'Sharma',
  'H.', 'K.', 'Yadav', 'Chowdary', 'Naik', 'Verma', 'Kaur', 'Gill'];
const GRADES = ['A', 'B', 'C'];

/** EXTRA standalone farmers (buyer-discoverable only, same shape as the
 * curated `additionalFarmers`), enough to clear the 50+ requirement
 * combined with the 3 curated ones + the 1 demo login farmer. */
export function generateMoreFarmers(count = 50) {
  const farmers = [];
  for (let i = 0; i < count; i++) {
    const town = MARKET_TOWNS[i % MARKET_TOWNS.length];
    const crops = TOWN_CROPS[town.name] || CROPS;
    const crop = crops[i % crops.length];
    const village = VILLAGE_POOL[i % VILLAGE_POOL.length];
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length];
    farmers.push({
      name: `${first} ${last}`,
      location: {
        village, district: town.district, state: town.state,
        lat: 12 + spread(i, 15), lng: 75 + spread(i + 7, 8),
      },
      phone: `+91-90${String(1000 + i).padStart(5, '0')}`,
      currentCrop: {
        crop,
        quantityTonnes: Math.round((3 + spread(i + 11, 22)) * 10) / 10,
        grade: GRADES[i % GRADES.length],
        storageAvailable: i % 3 === 0,
      },
    });
  }
  return farmers;
}

const FPO_SUFFIXES = ['Farmer Producer Company Ltd', 'Agro Producer Company Ltd', 'FPO', 'Agri Producers Ltd'];

// Single curated demo FPO — this is the one account the "Try Demo FPO
// Account" button on the login page signs into (see seed.js, which
// attaches the User/password to this exact document by name), so it
// intentionally has a real, memorable name and a fully "verified"
// status rather than being one of the randomly-generated ones below.
export const demoFPO = {
  organizationName: 'Kolar Tomato Producers FPO',
  registrationNumber: 'FPO/KA/2021/00042',
  contactPerson: 'Manjunath Gowda',
  phone: '+91-9845012345',
  email: 'contact@kolartomatofpo.demo.in',
  location: { village: 'Srinivaspur', district: 'Kolar', state: 'Karnataka' },
  memberCount: 128,
  verificationStatus: 'verified',
};

/** 20+ FPOs (models/FPO.js) — registration + verification-workflow demo
 * data. verificationStatus is mixed so the FPO verification workflow
 * has real pending/verified/rejected examples to show, not just one. */
export function generateFPOs(count = 22) {
  const fpos = [];
  for (let i = 0; i < count; i++) {
    const town = MARKET_TOWNS[i % MARKET_TOWNS.length];
    const suffix = FPO_SUFFIXES[i % FPO_SUFFIXES.length];
    const status = ['verified', 'verified', 'pending', 'verified', 'rejected'][i % 5];
    fpos.push({
      organizationName: `${town.name} ${suffix}`,
      registrationNumber: `FPO/${town.state.slice(0, 2).toUpperCase()}/${2019 + (i % 6)}/${1000 + i}`,
      contactPerson: `${FIRST_NAMES[(i * 2) % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
      phone: `+91-98${String(2000 + i).padStart(5, '0')}`,
      email: `contact@${town.name.toLowerCase().replace(/\s+/g, '')}fpo${i}.demo.in`,
      location: { village: VILLAGE_POOL[(i * 5) % VILLAGE_POOL.length], district: town.district, state: town.state },
      memberCount: Math.round(80 + spread(i, 400)),
      verificationStatus: status,
      verificationNote: status === 'rejected' ? 'Registration document mismatch (demo data).' : undefined,
    });
  }
  return fpos;
}

const BUYER_NAME_TEMPLATES = [
  { tpl: (t) => `${t} Traders`, type: 'Trader/Aggregator', channel: 'Direct Trader' },
  { tpl: (t) => `${t} Agro Aggregators`, type: 'Trader/Aggregator', channel: 'Direct Trader' },
  { tpl: (t) => `${t} Cold Chain Co.`, type: 'Trader/Aggregator', channel: 'Direct Trader' },
  { tpl: (t) => `${t} Foods Processing`, type: 'Processor', channel: 'Processor' },
  { tpl: (t) => `${t} Retail Mart`, type: 'Retail Chain', channel: 'Retail Chain' },
  { tpl: (t) => `${t} Exports Ltd`, type: 'Exporter', channel: 'Exporter' },
  { tpl: (t) => `${t} Digital Marketplace`, type: 'Trader/Aggregator', channel: 'Digital Marketplace' },
];

/** EXTRA buyers (on top of the 14 curated ones), enough to clear the
 * 40+ requirement. Every 6th buyer is a Government Agency, matching the
 * curated set's mix of plain traders vs. institutional buyers. */
export function generateMoreBuyers(count = 30) {
  const buyersOut = [];
  for (let i = 0; i < count; i++) {
    const town = MARKET_TOWNS[(i * 2) % MARKET_TOWNS.length];
    const crops = TOWN_CROPS[town.name] || CROPS;
    const crop = crops[i % crops.length];
    const { base } = CROP_PRICE_BASE[crop];
    const isGovt = i % 6 === 5;
    const tpl = BUYER_NAME_TEMPLATES[i % BUYER_NAME_TEMPLATES.length];
    buyersOut.push({
      name: isGovt ? `${town.state} State Procurement Agency – ${town.name} (Demo)` : `${tpl.tpl(town.name)} (Demo)`,
      buyerType: isGovt ? 'Government Agency' : tpl.type,
      channel: isGovt ? 'Government Procurement' : tpl.channel,
      cropRequired: crop,
      gradeRequired: GRADES[i % GRADES.length],
      quantityRequiredTonnes: Math.round(8 + spread(i, 60)),
      offerPricePerKg: Math.round((base * (0.92 + spread(i + 4, 0.2))) * 100) / 100,
      location: town.name,
      distanceKm: town.distanceKm,
      requiredByDate: daysFromNow(2 + (i % 20)),
      verified: i % 5 !== 4,
      paymentReliabilityPct: Math.round(65 + spread(i + 8, 32)),
      completedTransactions: Math.round(spread(i + 9, 90)),
      disputedTransactionsPct: Math.round(spread(i + 10, 14)),
    });
  }
  return buyersOut;
}

// 365-day historical price + arrival dataset, seeded to the SEPARATE
// MONGO_URI2 database (see seed/seedHistoricalMandi.js) — supports the
// 7D/15D/30D/90D/180D/365D trend windows historicalMarketService.js
// already computes generically from `days`, no service-side change
// needed as long as 365 days of rows exist per crop/market.
export function generateHistoricalMandiRecords(marketRows, days = 365) {
  const records = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  marketRows.forEach(({ name, crop, state, district, modalPrice: startModal }, marketIndex) => {
    const { volatility } = CROP_PRICE_BASE[crop] || { volatility: 2 };
    let modal = startModal || CROP_PRICE_BASE[crop]?.base || 20;
    let arrival = 40 + spread(marketIndex, 60);

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);

      // Random-walk price with a mild seasonal wobble (harvest months
      // Oct-Feb see slightly higher arrivals / softer prices), same
      // spirit as randomWalkSeries() above but over a full year.
      const month = date.getMonth() + 1;
      const seasonal = [10, 11, 12, 1, 2].includes(month) ? 1.08 : 0.97;
      const noise = (spread(marketIndex * 400 + d, volatility * 2) - volatility);
      modal = Math.max((CROP_PRICE_BASE[crop]?.base || 20) * 0.55, modal + noise * 0.15);
      const dayModal = Math.round(modal * seasonal * 100) / 100;
      const spreadPct = 0.07 + spread(marketIndex + d, 0.05);
      const minPrice = Math.round(dayModal * (1 - spreadPct) * 100) / 100;
      const maxPrice = Math.round(dayModal * (1 + spreadPct) * 100) / 100;

      arrival = Math.max(10, arrival + (spread(marketIndex * 250 + d, 16) - 8));
      const arrivalVolume = Math.round(arrival * (seasonal > 1 ? 1.15 : 0.95) * 10) / 10;

      records.push({
        marketName: name, commodity: crop, state, district,
        date, minPrice, modalPrice: dayModal, maxPrice, arrivalVolume,
      });
    }
  });
  return records;
}