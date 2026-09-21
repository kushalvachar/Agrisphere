import { Router } from 'express';
import { createLot, listLots, getLot, matchLotsForBuyer } from '../controllers/lotController.js';
const router = Router();
router.get('/', listLots);
router.post('/', createLot);
router.post('/match', matchLotsForBuyer);
router.get('/:id', getLot);
export default router;