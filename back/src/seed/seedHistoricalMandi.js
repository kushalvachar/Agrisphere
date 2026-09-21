// seed/seedHistoricalMandi.js — Task 4 (Advanced Seed Data): populates
// the SEPARATE MONGO_URI2 database with a full 365-day historical mandi
// price + arrival-volume dataset.
//
// Deliberately a standalone script (own `npm run seed:historical`),
// NOT folded into seed.js — MONGO_URI2 is an independent database from
// MONGODB_URI (see config/historicalDb.js) and the two are never meant
// to be cleared/reseeded together. Reuses the exact same connection
// helper (getHistoricalConnection) and model (getHistoricalMandiPriceModel)
// the live app already uses to READ this data, so the shape written
// here is guaranteed to match what historicalMarketService.js expects —
// no separate/duplicated field-name convention to keep in sync.
import 'dotenv/config';
import { getHistoricalConnection } from '../config/historicalDb.js';
import { getHistoricalMandiPriceModel } from '../models/HistoricalMandiPrice.js';
import { markets, generateMoreMarkets, generateHistoricalMandiRecords, CROPS } from './seedData.js';

const DAYS = Number(process.env.HISTORICAL_SEED_DAYS) || 365; // supports 7D/15D/30D/90D/180D/365D trend windows
const BATCH_SIZE = 2000; // insertMany in chunks so one 100-market x 365-day run (~36,500 docs) doesn't hit a single oversized bulk write

async function run() {
  if (!process.env.MONGO_URI2) {
    console.error('MONGO_URI2 is not set in .env — nothing to seed. See .env.example.');
    process.exit(1);
  }

  const conn = await getHistoricalConnection();
  if (!conn) {
    console.error('Could not connect to MONGO_URI2 — check the URI and that the cluster is reachable.');
    process.exit(1);
  }
  console.log('Connected to MONGO_URI2 (historical mandi dataset).');

  const Model = await getHistoricalMandiPriceModel();

  const collectionName = process.env.HISTORICAL_COLLECTION_NAME || 'mandi_prices';
  console.log(`Clearing existing "${collectionName}" collection on MONGO_URI2...`);
  await Model.deleteMany({});

  // Every market this app already knows about (the curated set +
  // Task-4's 100+ generated markets from seedData.js) gets a full
  // 365-day back-history — one crop's price at one market, per day.
  const allMarketRows = [...markets, ...generateMoreMarkets()];

  console.log(`Generating ${DAYS} days of history for ${allMarketRows.length} markets across ${CROPS.length} crops...`);
  const records = generateHistoricalMandiRecords(allMarketRows, DAYS);
  console.log(`Generated ${records.length} records (minPrice/modalPrice/maxPrice/arrivalVolume per crop/market/day).`);

  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await Model.insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${records.length}...`);
  }
  console.log('\nDone.');

  console.log('Historical mandi seed complete:');
  console.log(`  Markets covered: ${allMarketRows.length}`);
  console.log(`  Crops covered: ${CROPS.join(', ')}`);
  console.log(`  Days per crop/market: ${DAYS}`);
  console.log(`  Total records: ${records.length}`);
  console.log('  Fields per record: marketName, commodity, state, district, date, minPrice, modalPrice, maxPrice, arrivalVolume');
  console.log('  Supports 7D/15D/30D/90D/180D/365D trend windows via getHistoricalTrend({ crop, market, days }).');
  console.log('NOTE: synthetic demo data for this SIH 2026 hackathon prototype, NOT official AGMARKNET/eNAM data.');

  await conn.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Historical mandi seeding failed:', err);
  process.exit(1);
});