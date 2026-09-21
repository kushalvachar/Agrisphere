// api/client.js — tiny fetch wrapper shared by all pages.
// Centralizing this makes it easy to add error handling or a base URL
// change in exactly one place.
const BASE = import.meta.env.VITE_API_URL||'/api';
const AUTH_TOKEN_KEY = 'agrisphere_auth_token'; // kept in sync with context/AuthContext.jsx

async function request(path, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request to ${path} failed`);
  }
  return data;
}

export const api = {
  getDemoFarmer: () => request('/farmers/demo'),
  getFarmer: (id) => request(`/farmers/${id}`),
  listFarmers: (params = {}) => request(`/farmers?${new URLSearchParams(params)}`),
  quickCreateFarmer: (body) => request('/farmers/quick-create', { method: 'POST', body: JSON.stringify(body) }),
  matchFarmersForBuyer: (body) => request('/farmers/match', { method: 'POST', body: JSON.stringify(body) }),
  getMarkets: (params = {}) => request(`/markets?${new URLSearchParams(params)}`),
  getMarketTrends: (params = {}) => request(`/markets/trends?${new URLSearchParams(params)}`),
  // Phase 2: Market Intelligence Engine
  getCommodityIntelligence: (params = {}) => request(`/markets/intelligence?${new URLSearchParams(params)}`),
  getMarketActivity: (params = {}) => request(`/markets/activity?${new URLSearchParams(params)}`),
  // Feature: Historical Market Data (separate MONGO_URI2 dataset) — last 7 days per market
  getMarketHistory: (params = {}) => request(`/markets/history?${new URLSearchParams(params)}`),
  // Phase 3: Live Mandi Tiles
  getLiveMandiTiles: (params = {}) => request(`/markets/live-tiles?${new URLSearchParams(params)}`),
  getBuyers: (params = {}) => request(`/buyers?${new URLSearchParams(params)}`),
  createBuyerRequirement: (body) => request('/buyers', { method: 'POST', body: JSON.stringify(body) }),
  matchBuyers: (body) => request('/buyers/match', { method: 'POST', body: JSON.stringify(body) }),
  getLogistics: (params = {}) => request(`/logistics?${new URLSearchParams(params)}`),
  getRecommendation: (body) => request('/recommendation', { method: 'POST', body: JSON.stringify(body) }),
  analyzeQuality: (body) => request('/quality/analyze', { method: 'POST', body: JSON.stringify(body) }),
  createLot: (body) => request('/lots', { method: 'POST', body: JSON.stringify(body) }),
  listLots: (params = {}) => request(`/lots?${new URLSearchParams(params)}`),
  getLot: (id) => request(`/lots/${id}`),
  matchLotsForBuyer: (body) => request('/lots/match', { method: 'POST', body: JSON.stringify(body) }),
  listTransactions: () => request('/transactions'),
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransactionStatus: (id, status) => request(`/transactions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createDispute: (body) => request('/disputes', { method: 'POST', body: JSON.stringify(body) }),
  listDisputes: () => request('/disputes'),
  askAssistant: (body) => request('/ai/ask', { method: 'POST', body: JSON.stringify(body) }),

  // --- Feature 1: Arrival Volume Intelligence ---
  getArrivals: (params = {}) => request(`/arrivals?${new URLSearchParams(params)}`),

  // --- Feature 2: Buyer Demand Forecasting ---
  getDemandForecast: (params = {}) => request(`/demand-forecast?${new URLSearchParams(params)}`),

  // --- Feature 3: Digital Offer & Negotiation System ---
  createOffer: (body) => request('/offers', { method: 'POST', body: JSON.stringify(body) }),
  listOffers: (params = {}) => request(`/offers?${new URLSearchParams(params)}`),
  getOffer: (id) => request(`/offers/${id}`),
  counterOffer: (id, body) => request(`/offers/${id}/counter`, { method: 'POST', body: JSON.stringify(body) }),
  acceptOffer: (id) => request(`/offers/${id}/accept`, { method: 'PATCH' }),
  rejectOffer: (id) => request(`/offers/${id}/reject`, { method: 'PATCH' }),
  withdrawOffer: (id) => request(`/offers/${id}/withdraw`, { method: 'PATCH' }),

  // --- Feature 5: Multi-Channel Market Comparison ---
  compareChannels: (params = {}) => request(`/channels/compare?${new URLSearchParams(params)}`),

  // --- Phase 5: Authentication ---
  registerFarmer: (body) => request('/auth/register/farmer', { method: 'POST', body: JSON.stringify(body) }),
  registerFPO: (body) => request('/auth/register/fpo', { method: 'POST', body: JSON.stringify(body) }),
  registerBuyer: (body) => request('/auth/register/buyer', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // --- Phase 7: Quality Requirement System (persisted submissions) ---
  submitQuality: (body) => request('/quality/submissions', { method: 'POST', body: JSON.stringify(body) }),
  listQualitySubmissions: (params = {}) => request(`/quality/submissions?${new URLSearchParams(params)}`),
  getQualitySubmission: (id) => request(`/quality/submissions/${id}`),

  // --- Phase 8: Logistics Transparency (shipment tracking) ---
  createShipment: (body) => request('/shipments', { method: 'POST', body: JSON.stringify(body) }),
  getShipmentByTransaction: (transactionId) => request(`/shipments/by-transaction/${transactionId}`),
  assignShipmentVehicle: (id, body) => request(`/shipments/${id}/vehicle`, { method: 'PATCH', body: JSON.stringify(body) }),
  confirmShipmentPickup: (id) => request(`/shipments/${id}/pickup`, { method: 'PATCH' }),
  addShipmentCheckpoint: (id, body) => request(`/shipments/${id}/checkpoints`, { method: 'POST', body: JSON.stringify(body) }),
  markShipmentDelivered: (id) => request(`/shipments/${id}/deliver`, { method: 'PATCH' }),

  // --- Phase 9: Payment Tracking ---
  updatePaymentStatus: (id, body) => request(`/transactions/${id}/payment`, { method: 'PATCH', body: JSON.stringify(body) }),

  // --- Phase 10: Storage & Warehouse Discovery ---
  getStorage: (params = {}) => request(`/storage?${new URLSearchParams(params)}`),

  // --- Phase 11: Analytics Dashboard ---
  getFarmerAnalytics: (params = {}) => request(`/analytics/farmer?${new URLSearchParams(params)}`),
  getBuyerAnalytics: (params = {}) => request(`/analytics/buyer?${new URLSearchParams(params)}`),
  getFpoAnalytics: (params = {}) => request(`/analytics/fpo?${new URLSearchParams(params)}`),

  // --- Phase 12.5: Opportunity Map ---
  getOpportunityMap: (params = {}) => request(`/analytics/opportunity-map?${new URLSearchParams(params)}`),
};