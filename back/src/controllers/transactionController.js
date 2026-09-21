// controllers/transactionController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Transaction from '../models/Transaction.js';

// POST /api/transactions
export const createTransaction = asyncHandler(async (req, res) => {
  const { farmerName, buyerName, crop, quantityTonnes, agreedPricePerKg, netRealizationPerKg } = req.body;
  const totalAmount = quantityTonnes && agreedPricePerKg ? Math.round(quantityTonnes * 1000 * agreedPricePerKg) : undefined;
  const tx = await Transaction.create({
    farmerName, buyerName, crop, quantityTonnes, agreedPricePerKg, netRealizationPerKg,
    status: 'OFFER_CREATED',
    history: [{ status: 'OFFER_CREATED' }],
    payment: { status: 'PENDING', totalAmount, history: [{ status: 'PENDING', amount: 0 }] },
  });
  res.status(201).json({ success: true, transaction: tx });
});

// PATCH /api/transactions/:id/payment  { status, amount, note }
// Phase 9: Payment Tracking. Always scoped to a real, existing
// transaction (:id) — there is no endpoint that creates a payment
// record on its own, so every payment entry is tied to an actual deal.
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status, amount, note } = req.body;
  if (!Transaction.PAYMENT_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of ${Transaction.PAYMENT_STATUSES.join(', ')}` });
  }
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

  tx.payment.status = status;
  if (status === 'ADVANCE_PAID' && amount) tx.payment.advanceAmount = amount;
  tx.payment.history.push({ status, amount, note });
  if (status === 'COMPLETED') {
    tx.status = 'PAYMENT_RECEIVED';
    tx.history.push({ status: 'PAYMENT_RECEIVED' });
  }
  await tx.save();

  res.json({ success: true, transaction: tx });
});

// PATCH /api/transactions/:id/status  { status }
export const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Transaction.STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of ${Transaction.STATUSES.join(', ')}` });
  }
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

  tx.status = status;
  tx.history.push({ status });
  await tx.save();

  res.json({ success: true, transaction: tx });
});

// GET /api/transactions
export const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({}).sort({ createdAt: -1 }).lean();
  res.json({ success: true, transactions });
});
