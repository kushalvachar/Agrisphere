import { Router } from 'express';
import { getArrivals } from '../controllers/arrivalController.js';
const router = Router();
router.get('/', getArrivals);
export default router;