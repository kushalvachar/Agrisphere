// models/Transaction.js — lifecycle of an accepted offer, from creation to payment.
import mongoose from 'mongoose';

const STATUSES = [
  'OFFER_CREATED',
  'OFFER_ACCEPTED',
  'PICKUP_SCHEDULED',
  'IN_TRANSIT',
  'DELIVERED',
  'PAYMENT_RECEIVED',
];

// Phase 9: Payment Tracking System. A finer-grained sub-status than the
// transaction's own PAYMENT_RECEIVED — this is what a payment timeline
// actually needs (was an advance paid? is it sitting in escrow?), all
// scoped to this one real transaction so there is no way to record a
// payment against a transaction that doesn't exist.
const PAYMENT_STATUSES = ['PENDING', 'ADVANCE_PAID', 'IN_ESCROW', 'RELEASED', 'COMPLETED'];

const paymentHistoryEntrySchema = new mongoose.Schema({
  status: { type: String, enum: PAYMENT_STATUSES, required: true },
  amount: Number,
  note: String,
  at: { type: Date, default: Date.now },
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  farmerName: String,
  buyerName: String,
  crop: String,
  quantityTonnes: Number,
  agreedPricePerKg: Number,
  netRealizationPerKg: Number,
  status: { type: String, enum: STATUSES, default: 'OFFER_CREATED' },
  history: [{ status: String, at: { type: Date, default: Date.now } }],
  payment: {
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    totalAmount: Number,
    advanceAmount: Number,
    history: [paymentHistoryEntrySchema],
  },
}, { timestamps: true });

transactionSchema.statics.STATUSES = STATUSES;
transactionSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

export default mongoose.model('Transaction', transactionSchema);
