import { Router } from 'express';
import { registerFarmer, registerFPO, registerBuyer, login, me, reviewFpo, reviewBuyer } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register/farmer', registerFarmer);
router.post('/register/fpo', registerFPO);
router.post('/register/buyer', registerBuyer);
router.post('/login', login);
router.get('/me', requireAuth(), me);

// Verification workflow placeholders — see authController.js comments.
router.patch('/fpo/:id/verify', reviewFpo);
router.patch('/buyer/:id/verify', reviewBuyer);

export default router;
