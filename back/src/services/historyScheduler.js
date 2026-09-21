// services/historyScheduler.js — Phase 2: Market Intelligence Engine.
//
// PriceHistory only grows when a live fetch happens. That normally
// happens whenever someone views a crop's Market Intelligence page —
// but for the 30-day trend/prediction to stay useful even on days
// nobody happens to look at a given crop, this scheduler re-polls
// every {crop, state, district} combination that has EVER been
// genuinely searched for (TrackedMarketQuery — populated automatically
// by marketDataService, never hand-seeded) once every 24 hours.
//
// This is what makes "historical data must be collected dynamically"
// true in practice, not just in architecture: leave the backend
// running and PriceHistory keeps filling in real days on its own.
import TrackedMarketQuery from '../models/TrackedMarketQuery.js';
import { getMarketPrices } from './marketDataService.js';

const POLL_INTERVAL_MS = Number(process.env.HISTORY_POLL_INTERVAL_MS) || 24 * 60 * 60 * 1000; // 24h
const STARTUP_DELAY_MS = 15 * 1000; // let Mongo connect first
const DELAY_BETWEEN_QUERIES_MS = 1500; // be polite to the data.gov.in API

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollAllTrackedQueries() {
  const tracked = await TrackedMarketQuery.find({}).lean();
  if (!tracked.length) return; // nothing has ever been searched yet — nothing to keep fresh

  console.log(`historyScheduler: polling ${tracked.length} tracked crop/region combination(s) for fresh price history…`);
  for (const t of tracked) {
    try {
      await getMarketPrices({ crop: t.crop, state: t.state || undefined, district: t.district || undefined });
      await TrackedMarketQuery.updateOne({ _id: t._id }, { $set: { lastPolledAt: new Date() } });
    } catch (err) {
      console.error(`historyScheduler: poll failed for "${t.crop}" (${t.state || 'any state'}):`, err.message);
    }
    await sleep(DELAY_BETWEEN_QUERIES_MS);
  }
}

export function startHistoryScheduler() {
  setTimeout(() => {
    pollAllTrackedQueries();
    setInterval(pollAllTrackedQueries, POLL_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}
