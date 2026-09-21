import { Router } from 'express';
import { listBuyers, matchBuyersHandler, createBuyerRequirement } from '../controllers/buyerController.js';
const router = Router();
router.get('/', listBuyers);
router.post('/', createBuyerRequirement);
router.post('/match', matchBuyersHandler);
export default router;