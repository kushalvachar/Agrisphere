// services/multiChannelService.js — Feature 5: Multi-Channel Market Comparison.
//
// Pulls opportunities from every channel — APMC mandis, eNAM, and every
// buyer channel (Processor, Retail Chain, Exporter, Government
// Procurement, Digital Marketplace, Direct Trader) — and ranks them all
// on the SAME deterministic net-realization formula from
// profitCalculator.js, so the comparison is apples-to-apples. Gemini is
// not involved in this ranking at all.
import Buyer from '../models/Buyer.js';
import Logistics from '../models/Logistics.js';
import { getMarketPrices } from './marketDataService.js';
import { rankByNetRealization } from './profitCalculator.js';

export async function compareChannels({ crop, quantityTonnes, grade }) {
  const [{ markets }, buyers, logisticsOptions] = await Promise.all([
    getMarketPrices({ crop }),
    Buyer.find({ cropRequired: crop }).lean(),
    Logistics.find({}).lean(),
  ]);

  const marketOptions = markets.map((m) => {
    const route = logisticsOptions.find((l) => l.destination === m.name);
    // distanceKm is no longer available from the live market feed (see
    // marketDataService.js) — fall back to a flat transport estimate.
    const transportCostPerKg = route ? route.costPerKg : (m.distanceKm != null ? Math.max(0.3, m.distanceKm * 0.02) : 0.5);
    return {
      label: m.name,
      channel: m.channel || 'APMC',
      channelGroup: 'Market',
      sellingPricePerKg: m.modalPrice,
      transportCostPerKg,
      distanceKm: m.distanceKm,
      arrivalQuantityTonnes: m.arrivalQuantityTonnes,
    };
  });

  const buyerOptions = buyers
    // if quantity/grade given, only show buyers that could plausibly take this lot
    .filter((b) => !quantityTonnes || !b.quantityRequiredTonnes || b.quantityRequiredTonnes <= quantityTonnes * 3)
    .map((b) => {
      const route = logisticsOptions.find((l) => l.destination === b.location || l.destination === b.name);
      const transportCostPerKg = route ? route.costPerKg : Math.max(0.3, (b.distanceKm || 10) * 0.02);
      return {
        label: b.name,
        channel: b.channel || 'Direct Trader',
        channelGroup: 'Buyer',
        sellingPricePerKg: b.offerPricePerKg,
        transportCostPerKg,
        distanceKm: b.distanceKm,
        buyerType: b.buyerType,
        gradeRequired: b.gradeRequired,
        requirements: b.requirements || null,
        gradeMismatch: grade && b.gradeRequired ? grade !== b.gradeRequired : false,
      };
    });

  const ranked = rankByNetRealization([...marketOptions, ...buyerOptions]);

  const byChannel = {};
  ranked.forEach((opt) => {
    byChannel[opt.channel] = byChannel[opt.channel] || [];
    byChannel[opt.channel].push(opt);
  });

  return {
    ranked,
    byChannel,
    best: ranked[0] || null,
  };
}