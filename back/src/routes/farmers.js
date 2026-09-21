import { Router } from 'express';
import { getDemoFarmer, getFarmer, listFarmers, matchFarmersForBuyer, quickCreateFarmer } from '../controllers/farmerController.js';
const router = Router();
router.get('/demo', getDemoFarmer);
router.get('/', listFarmers);
router.post('/quick-create', quickCreateFarmer);
router.post('/match', matchFarmersForBuyer);
// Kept below the literal '/demo' route so it doesn't shadow it.
router.get('/:id', getFarmer);
export default router;