import { Router } from 'express';
import { listLogistics } from '../controllers/logisticsController.js';
const router = Router();
router.get('/', listLogistics);
export default router;
