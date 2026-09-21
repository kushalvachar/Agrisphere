import { Router } from 'express';
import {
  createOfferHandler, listOffers, getOffer, counterOffer, acceptOffer, rejectOffer, withdrawOffer,
} from '../controllers/offerController.js';
const router = Router();
router.get('/', listOffers);
router.post('/', createOfferHandler);
router.get('/:id', getOffer);
router.post('/:id/counter', counterOffer);
router.patch('/:id/accept', acceptOffer);
router.patch('/:id/reject', rejectOffer);
router.patch('/:id/withdraw', withdrawOffer);
export default router;