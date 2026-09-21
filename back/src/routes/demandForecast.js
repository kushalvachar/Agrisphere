import { Router } from 'express';
import { getDemandForecast } from '../controllers/demandForecastController.js';
const router = Router();
router.get('/', getDemandForecast);
export default router;