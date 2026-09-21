// services/priceTrendService.js — Phase 2: Market Intelligence Engine.
//
// Turns the real PriceHistory rows collected by marketDataService into:
//   1. a day-by-day series suitable for a 7/15/30-day trend graph
//   2. a deterministic price-prediction label (rising/falling/stable)
//
// The prediction is NOT an AI guess — it is a plain first-half-vs-
// second-half average comparison over whatever real history exists,
// the same category of transparent heuristic already used by
// arrivalVolumeService for arrival/price correlation. If Gemini is
// asked to comment on it later (recommendationController), it is only
// ever handed this already-computed number, never asked to invent one.
//
// Because history only exists from the day this feature started
// collecting it, `daysOfDataCollected` tells the caller exactly how
// much real history is behind the number — the frontend shows this
// honestly instead of pretending a full 30-day window always exists.
import PriceHistory from '../models/PriceHistory.js';

const RISING_THRESHOLD_PCT = 2;
const FALLING_THRESHOLD_PCT = -2;

/**
 * @param {Object} params - { crop, market?, state?, district?, days }
 * @returns {Promise<{ series: Array, prediction: Object, daysOfDataCollected: number }>}
 */
export async function getPriceTrend({ crop, market, state, district, days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const query = { crop, date: { $gte: since } };
  if (market) query.market = market;
  if (state) query.state = state;
  if (district) query.district = district;

  const rows = await PriceHistory.find(query).sort({ date: 1 }).lean();

  // Per-day series, grouped by market (so a multi-line graph is
  // possible), plus a per-day average across all matching markets
  // (used for the prediction — a single market's chart is easy to
  // eyeball, but "is the crop rising overall" needs the average).
  const byDate = new Map(); // 'YYYY-MM-DD' -> { date, avgModalPrice, markets: {name: price} }
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { date: row.date, markets: {} });
    byDate.get(key).markets[row.market] = row.modalPrice;
  }

  const series = [...byDate.values()]
    .sort((a, b) => a.date - b.date)
    .map((d) => {
      const prices = Object.values(d.markets);
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      return { date: d.date, avgModalPrice: Math.round(avg * 100) / 100, markets: d.markets };
    });

  const daysOfDataCollected = series.length;
  const prediction = computePrediction(series);

  return { series, prediction, daysOfDataCollected, requestedDays: days };
}

function computePrediction(series) {
  if (series.length < 2) {
    return {
      direction: 'insufficient_data',
      changePct: 0,
      message: 'Not enough history collected yet for this crop — check back after a few more days of data collection.',
    };
  }

  const half = Math.floor(series.length / 2) || 1;
  const earlier = series.slice(0, half);
  const later = series.slice(half);
  const avg = (arr) => arr.reduce((s, x) => s + x.avgModalPrice, 0) / arr.length;
  const earlierAvg = avg(earlier);
  const laterAvg = avg(later.length ? later : earlier);
  const changePct = earlierAvg > 0 ? Math.round(((laterAvg - earlierAvg) / earlierAvg) * 10000) / 100 : 0;

  let direction = 'stable';
  if (changePct >= RISING_THRESHOLD_PCT) direction = 'rising';
  else if (changePct <= FALLING_THRESHOLD_PCT) direction = 'falling';

  return { direction, changePct, earlierAvg: Math.round(earlierAvg * 100) / 100, laterAvg: Math.round(laterAvg * 100) / 100 };
}
