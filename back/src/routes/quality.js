import { Router } from 'express';
import { analyzeQuality, submitQuality, listQualitySubmissions, getQualitySubmission } from '../controllers/qualityController.js';
const router = Router();
router.post('/analyze', analyzeQuality);
router.post('/submissions', submitQuality);
router.get('/submissions', listQualitySubmissions);
router.get('/submissions/:id', getQualitySubmission);
export default router;
