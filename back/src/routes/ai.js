import { Router } from 'express';
import { askAssistant, interpretCommand } from '../controllers/aiController.js';
const router = Router();
router.post('/ask', askAssistant);
router.post('/interpret', interpretCommand);
export default router;