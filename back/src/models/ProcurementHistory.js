// models/ProcurementHistory.js — Feature 2: Buyer Demand Forecasting.
// Monthly quantity a given buyer actually procured in the past, per
// crop. This is the raw signal the deterministic forecaster works from
// — Gemini never sees or invents these numbers, it only narrates the
// forecast that's already been computed.
import mongoose from 'mongoose';

const procurementHistorySchema = new mongoose.Schema({
  buyerName: { type: String, required: true },
  crop: { type: String, required: true },
  month: { type: Number, required: true },   // 1-12
  year: { type: Number, required: true },
  quantityProcuredTonnes: { type: Number, required: true },
}, { timestamps: true });

procurementHistorySchema.index({ buyerName: 1, crop: 1, year: 1, month: 1 });

export default mongoose.model('ProcurementHistory', procurementHistorySchema);