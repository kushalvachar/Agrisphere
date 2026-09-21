import { Router } from 'express';
import { menu, prices, offers, goodbye } from '../controllers/ivrController.js';
const router = Router();
router.get('/menu', menu);
router.post('/prices', prices);
router.post('/offers', offers);
router.get('/goodbye', goodbye);
export default router;