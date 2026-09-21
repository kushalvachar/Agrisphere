// services/marketActivityService.js — Phase 2: Market Intelligence Engine.
//
// IMPORTANT HONESTY NOTE: the configured live data source (data.gov.in
// resource 9ef84268-d588-465a-a308-a864a43d0070, "Current Daily Price of
// Various Commodities from Various Markets") does NOT publish arrival
// quantity (tonnes) — only min/max/modal price per market. The
// pre-existing ArrivalVolume model/arrivalVolumeService in this codebase
// was built against synthetic seed tonnage figures, which this project's
// "no mock/seed data anywhere" requirement rules out for anything shown
// as live intelligence.
//
// Rather than invent tonnage numbers, this service computes a real,
// dynamically-collected proxy: how many distinct mandis reported a
// price for this crop each day, from the same live-collected
// PriceHistory rows the trend graph uses. More reporting markets is a
// genuine (if coarser) signal of market activity/liquidity. If a live
// arrivals-quantity resource is added later (a different data.gov.in
// resource ID), swap the aggregation below for it — the shape of the
// response is deliberately kept close to the old arrival-volume shape
// so the frontend/AI-insight wiring doesn't need to change again.
import PriceHistory from '../models/PriceHistory.js';

export async function getMarketActivity({ crop, days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await PriceHistory.find({ crop, date: { $gte: since } }).sort({ date: 1 }).lean();
  if (!rows.length) {
    return { series: [], stats: null, message: 'No market activity data collected yet for this crop — check back soon.' };
  }

  const byDate = new Map();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { date: row.date, markets: new Set(), priceSum: 0, priceCount: 0 });
    const bucket = byDate.get(key);
    bucket.markets.add(row.market);
    bucket.priceSum += row.modalPrice;
    bucket.priceCount += 1;
  }

  const series = [...byDate.values()]
    .sort((a, b) => a.date - b.date)
    .map((d) => ({
      date: d.date,
      reportingMarkets: d.markets.size,
      avgModalPrice: Math.round((d.priceSum / d.priceCount) * 100) / 100,
    }));

  const half = Math.floor(series.length / 2) || 1;
  const recent = series.slice(half);
  const prior = series.slice(0, half);
  const avgReporting = (arr) => arr.reduce((s, x) => s + x.reportingMarkets, 0) / (arr.length || 1);
  const recentAvg = Math.round(avgReporting(recent.length ? recent : prior) * 100) / 100;
  const priorAvg = Math.round(avgReporting(prior) * 100) / 100;
  const changePct = priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 10000) / 100 : 0;

  return {
    series,
    stats: {
      recentAvgReportingMarkets: recentAvg,
      priorAvgReportingMarkets: priorAvg,
      reportingChangePct: changePct,
      windowDays: series.length,
      metric: 'Number of distinct mandis reporting a price each day (real, from live data.gov.in collection) — a liquidity/activity proxy, not arrival tonnage.',
    },
  };
}
