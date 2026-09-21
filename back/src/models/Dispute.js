// models/Dispute.js — a simple grievance ticket tied to a transaction.
import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  issueType: String,
  description: String,
  evidenceImageBase64: String, // demo-only; kept out of API responses that list many disputes
  status: { type: String, enum: ['Open', 'Under Review', 'Resolved'], default: 'Open' },
}, { timestamps: true });

export default mongoose.model('Dispute', disputeSchema);
