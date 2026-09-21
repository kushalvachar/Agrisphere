import { Router } from 'express';
import { listMarkets, getMarketTrends, getCommodityIntelligence, getMarketActivityIntelligence, getLiveMandiTiles, getHistoricalMarketTrend } from '../controllers/marketController.js';
const router = Router();
router.get('/trends', getMarketTrends);
router.get('/intelligence', getCommodityIntelligence);
router.get('/activity', getMarketActivityIntelligence);
router.get('/live-tiles', getLiveMandiTiles); // Phase 3
router.get('/history', getHistoricalMarketTrend); // Feature: Historical Market Data (MONGO_URI2)
router.get('/', listMarkets);
export default router;