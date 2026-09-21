// models/Lot.js — an FPO "Smart Lot": several farmers' small quantities pooled together.
import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema({
  farmerName: String,
  quantityTonnes: Number,
}, { _id: false });

const lotSchema = new mongoose.Schema({
  crop: { type: String, required: true },
  grade: String,
  contributions: [contributionSchema],
  totalQuantityTonnes: Number,   // sum of contributions, kept in sync on save
  status: { type: String, enum: ['FORMING', 'READY', 'MATCHED'], default: 'FORMING' },
}, { timestamps: true });

lotSchema.pre('save', function (next) {
  this.totalQuantityTonnes = (this.contributions || []).reduce(
    (sum, c) => sum + (c.quantityTonnes || 0), 0,
  );
  next();
});

export default mongoose.model('Lot', lotSchema);
