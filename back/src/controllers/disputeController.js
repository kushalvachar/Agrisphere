// controllers/disputeController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Dispute from '../models/Dispute.js';

// POST /api/disputes
export const createDispute = asyncHandler(async (req, res) => {
  const { transactionId, issueType, description, evidenceImageBase64 } = req.body;
  if (!transactionId || !issueType) {
    return res.status(400).json({ success: false, message: 'transactionId and issueType are required' });
  }
  const dispute = await Dispute.create({ transactionId, issueType, description, evidenceImageBase64, status: 'Open' });
  res.status(201).json({ success: true, dispute: { ...dispute.toObject(), evidenceImageBase64: undefined } });
});

// GET /api/disputes
export const listDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({}).select('-evidenceImageBase64').sort({ createdAt: -1 }).lean();
  res.json({ success: true, disputes });
});
