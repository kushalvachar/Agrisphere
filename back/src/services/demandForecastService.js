// services/demandForecastService.js — Feature 2: Buyer Demand Forecasting.
//
// Deterministic forecasting only: a seasonal-index-adjusted moving
// average over ProcurementHistory. Gemini is only used afterwards
// (see geminiService.getDemandForecastExplanation) to turn the computed
// numbers into a narrative — it never generates the forecast itself.
import ProcurementHistory from '../models/ProcurementHistory.js';

/**
 * Forecasts next month's likely procurement quantity for either a
 * single buyer or the aggregate of all buyers for a crop.
 *
 * Method: seasonal-naive with trend adjustment —
 *   1. Group history by calendar month across all available years.
 *   2. seasonalIndex(month) = avg(quantity in that month) / avg(all months)
 *   3. recentTrend = average % change over the last 3 available months
 *   4. forecast = overallAverage * seasonalIndex(nextMonth) * (1 + recentTrend)
 *
 * This is intentionally simple and auditable rather than a black-box
 * ML model — appropriate for a transparent hackathon prototype.
 */
export async function forecastDemand({ crop, buyerName }) {
  const query = { crop };
  if (buyerName) query.buyerName = buyerName;

  const records = await ProcurementHistory.find(query).sort({ year: 1, month: 1 }).lean();
  if (records.length < 3) {
    return { forecast: null, message: 'Not enough procurement history to forecast yet.' };
  }

  const overallAvg = average(records.map((r) => r.quantityProcuredTonnes));

  const byMonth = {};
  records.forEach((r) => {
    byMonth[r.month] = byMonth[r.month] || [];
    byMonth[r.month].push(r.quantityProcuredTonnes);
  });
  const seasonalIndex = {};
  Object.entries(byMonth).forEach(([m, qtys]) => {
    seasonalIndex[m] = overallAvg > 0 ? average(qtys) / overallAvg : 1;
  });

  const last = records[records.length - 1];
  const nextMonth = last.month === 12 ? 1 : last.month + 1;
  const nextYear = last.month === 12 ? last.year + 1 : last.year;

  const recentSlice = records.slice(-3);
  const recentTrend = trendPct(recentSlice.map((r) => r.quantityProcuredTonnes));

  const seasonal = seasonalIndex[nextMonth] ?? 1;
  const rawForecast = overallAvg * seasonal * (1 + recentTrend / 100);
  const forecastQuantityTonnes = Math.max(0, round2(rawForecast));

  const history = records.map((r) => ({
    month: r.month, year: r.year, quantityProcuredTonnes: r.quantityProcuredTonnes,
  }));

  return {
    forecast: {
      buyerName: buyerName || 'All buyers (aggregate)',
      crop,
      forecastMonth: nextMonth,
      forecastYear: nextYear,
      forecastQuantityTonnes,
      basis: {
        overallAverageTonnes: round2(overallAvg),
        seasonalIndexForMonth: round2(seasonal),
        recentTrendPct: round2(recentTrend),
      },
    },
    history,
  };
}

function average(nums) {
  return nums.reduce((s, n) => s + n, 0) / (nums.length || 1);
}

function trendPct(nums) {
  if (nums.length < 2) return 0;
  const first = nums[0];
  const last = nums[nums.length - 1];
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}