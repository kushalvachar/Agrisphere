import { Router } from 'express';
import { generateRecommendation } from '../controllers/recommendationController.js';
const router = Router();
router.post('/', generateRecommendation);
export default router;
