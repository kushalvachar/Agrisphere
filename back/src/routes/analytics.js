import { Router } from 'express';
import { getFarmerAnalytics, getBuyerAnalytics, getFpoAnalytics, getOpportunityMap } from '../controllers/analyticsController.js';

const router = Router();
router.get('/farmer', getFarmerAnalytics);
router.get('/buyer', getBuyerAnalytics);
router.get('/fpo', getFpoAnalytics);
router.get('/opportunity-map', getOpportunityMap);

export default router;
