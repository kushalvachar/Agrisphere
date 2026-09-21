// models/Storage.js — cold-storage / warehouse facility directory entry.
import mongoose from 'mongoose';

const storageSchema = new mongoose.Schema({
  facilityName: { type: String, required: true },
  location: String,
  type: { type: String, default: 'Cold Storage' },
  capacityTonnes: Number,
  availableCapacityTonnes: Number,
  costPerKgPerDay: Number,
  distanceKm: Number,
  // Phase 10: Storage & Warehouse Discovery — contact details.
  contact: String,
}, { timestamps: true });

export default mongoose.model('Storage', storageSchema);
