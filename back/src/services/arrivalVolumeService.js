// services/arrivalVolumeService.js — Feature 1: Arrival Volume Intelligence.
//
// All numbers here (averages, % changes, the price/arrival correlation
// label) are computed deterministically from ArrivalVolume + PriceHistory
// records. Gemini is only ever handed this summary afterwards to explain
// it in plain language (see geminiService.getArrivalVolumeInsight).
import ArrivalVolume from '../models/ArrivalVolume.js';
import PriceHistory from '../models/PriceHistory.js';

/**
 * @param {Object} filters - { crop, market }
 * @returns {Promise<{ series: Array, stats: Object }>}
 */
export async function getArrivalTrend({ crop, market }) {
  const query = { crop };
  if (market) query.market = market;

  const arrivals = await ArrivalVolume.find(query).sort({ date: 1 }).lean();
  if (!arrivals.length) {
    return { series: [], stats: null, message: 'No arrival volume data for this filter.' };
  }

  const prices = await PriceHistory.find(query).sort({ date: 1 }).lean();
  const priceByDate = new Map(prices.map((p) => [p.date.toISOString().slice(0, 10), p.modalPrice]));

  const series = arrivals.map((a) => ({
    date: a.date,
    market: a.market,
    arrivalQuantityTonnes: a.arrivalQuantityTonnes,
    modalPrice: priceByDate.get(a.date.toISOString().slice(0, 10)) ?? null,
  }));

  const stats = computeArrivalStats(series);
  return { series, stats };
}

/**
 * Deterministic stats: recent vs prior-period average arrivals, % change,
 * and a simple rule-based label for how arrivals appear to be relating
 * to price movement (this is NOT a statistical correlation coefficient —
 * it's a transparent, explainable heuristic suitable for a hackathon
 * demo, and is labelled as such).
 */
function computeArrivalStats(series) {
  const withPrice = series.filter((s) => s.modalPrice != null);
  const n = series.length;
  const half = Math.floor(n / 2);
  const recent = series.slice(half);
  const prior = series.slice(0, half);

  const avg = (arr) => arr.reduce((s, x) => s + x.arrivalQuantityTonnes, 0) / (arr.length || 1);
  const recentAvg = round2(avg(recent));
  const priorAvg = round2(avg(prior));
  const pctChange = priorAvg > 0 ? round2(((recentAvg - priorAvg) / priorAvg) * 100) : 0;

  let priceTrendLabel = 'insufficient data';
  if (withPrice.length >= 2) {
    const firstPrice = withPrice[0].modalPrice;
    const lastPrice = withPrice[withPrice.length - 1].modalPrice;
    const priceChangePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    if (pctChange > 10 && priceChangePct < -3) {
      priceTrendLabel = 'rising arrivals coinciding with falling prices — classic oversupply pressure';
    } else if (pctChange < -10 && priceChangePct > 3) {
      priceTrendLabel = 'falling arrivals coinciding with rising prices — tightening supply';
    } else {
      priceTrendLabel = 'no strong arrival-driven pressure detected in this window';
    }
  }

  return {
    recentAvgArrivalTonnes: recentAvg,
    priorAvgArrivalTonnes: priorAvg,
    arrivalChangePct: pctChange,
    priceTrendLabel,
    windowDays: n,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}