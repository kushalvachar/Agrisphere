import { Router } from 'express';
import { createTransaction, updateTransactionStatus, listTransactions, updatePaymentStatus } from '../controllers/transactionController.js';
const router = Router();
router.get('/', listTransactions);
router.post('/', createTransaction);
router.patch('/:id/status', updateTransactionStatus);
router.patch('/:id/payment', updatePaymentStatus); // Phase 9
export default router;
