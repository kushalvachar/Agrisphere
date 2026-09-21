import { Router } from 'express';
import { createDispute, listDisputes } from '../controllers/disputeController.js';
const router = Router();
router.get('/', listDisputes);
router.post('/', createDispute);
export default router;
