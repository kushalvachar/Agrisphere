// seed/seed.js — populates the PRIMARY MongoDB (MONGODB_URI) with demo
// data (spec section 18). Run with: npm run seed
//
// Task 4 (Advanced Seed Data): now generates 50+ farmers, 20+ FPOs,
// 40+ buyers and 100+ markets — the curated hand-written records from
// seedData.js (a handful of each, referenced by exact name elsewhere in
// the demo flow) are combined with programmatically-generated extras
// from the new generateMore*()/generateFPOs() functions rather than
// replaced, so nothing that already depends on e.g. 'ABC Foods (Demo)'
// or 'Kolar APMC' existing breaks.
import 'dotenv/config';
import mongoose from 'mongoose';
import Farmer from '../models/Farmer.js';
import Market from '../models/Market.js';
import Buyer from '../models/Buyer.js';
import FPO from '../models/FPO.js';
import Storage from '../models/Storage.js';
import Logistics from '../models/Logistics.js';
import PriceHistory from '../models/PriceHistory.js';
import ArrivalVolume from '../models/ArrivalVolume.js';           // Feature 1
import ProcurementHistory from '../models/ProcurementHistory.js'; // Feature 2
import Offer from '../models/Offer.js';                            // Feature 3
import {
  demoFarmer, additionalFarmers, markets, buyers, storageFacilities, logisticsOptions,
  generatePriceHistory, generateArrivalVolumeHistory, generateProcurementHistory,
  generateMoreFarmers, generateMoreBuyers, generateMoreMarkets, generateFPOs,
} from './seedData.js';

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrisphere';
  await mongoose.connect(uri);
  console.log('Connected to', uri);

  await Promise.all([
    Farmer.deleteMany({}),
    Market.deleteMany({}),
    Buyer.deleteMany({}),
    FPO.deleteMany({}),
    Storage.deleteMany({}),
    Logistics.deleteMany({}),
    PriceHistory.deleteMany({}),
    ArrivalVolume.deleteMany({}),
    ProcurementHistory.deleteMany({}),
    Offer.deleteMany({}),
  ]);
  console.log('Cleared existing demo collections.');

  const allFarmers = [...additionalFarmers, ...generateMoreFarmers(50)];
  const allBuyers = [...buyers, ...generateMoreBuyers(30)];
  const allMarkets = [...markets, ...generateMoreMarkets()];
  const allFpos = generateFPOs(22);

  await Farmer.create(demoFarmer);
  await Farmer.insertMany(allFarmers);
  await Market.insertMany(allMarkets.map((m) => ({ ...m, source: 'DEMO_SEED' })));
  await Buyer.insertMany(allBuyers.map((b) => ({ ...b, isDemoData: true })));
  await FPO.insertMany(allFpos);
  await Storage.insertMany(storageFacilities);
  await Logistics.insertMany(logisticsOptions);
  await PriceHistory.insertMany(generatePriceHistory());
  await ArrivalVolume.insertMany(generateArrivalVolumeHistory().map((r) => ({ ...r, source: 'DEMO_SEED' })));
  await ProcurementHistory.insertMany(generateProcurementHistory());
  // Offers start empty — they're created live during the demo via the
  // Digital Offer & Negotiation System (Feature 3), not seeded.

  const institutionalCount = allBuyers.filter((b) => b.buyerType !== 'Trader/Aggregator').length;

  console.log('Seed complete (primary DB):');
  console.log(`  Farmer: Ramesh Kumar (demo login) + ${allFarmers.length} additional standalone farmers (buyer-discoverable only)`);
  console.log(`  FPOs: ${allFpos.length} (registration + verification-workflow demo data)`);
  console.log(`  Markets: ${allMarkets.length} (APMC + eNAM channels)`);
  console.log(`  Buyers: ${allBuyers.length} total, incl. ${institutionalCount} institutional buyers (Processor/Retail Chain/Exporter/Government Agency)`);
  console.log(`  Storage facilities: ${storageFacilities.length}`);
  console.log(`  Logistics routes: ${logisticsOptions.length}`);
  console.log(`  Price history points: synthetic, ~60 days per crop/market`);
  console.log(`  Arrival volume points: synthetic, ~60 days per crop/market`);
  console.log(`  Procurement history points: synthetic, 12 months per buyer/crop`);
  console.log('NOTE: All farmer/buyer/FPO names and price/arrival/procurement data are');
  console.log('synthetic demo data for this SIH 2026 hackathon prototype, NOT official');
  console.log('AGMARKNET/eNAM data.');
  console.log('NOTE: run "npm run seed:historical" separately to populate the 365-day');
  console.log('MONGO_URI2 historical mandi price dataset used by Market Intelligence.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});