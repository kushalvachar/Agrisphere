import { Router } from 'express';
import { listStorage } from '../controllers/storageController.js';
const router = Router();
router.get('/', listStorage);
export default router;
