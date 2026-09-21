import { Router } from 'express';
import { getChannelComparison } from '../controllers/channelController.js';
const router = Router();
router.get('/compare', getChannelComparison);
export default router;