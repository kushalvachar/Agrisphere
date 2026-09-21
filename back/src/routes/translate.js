import { Router } from 'express';
import { translateStrings } from '../controllers/translateController.js';
const router = Router();
router.post('/', translateStrings);
export default router;