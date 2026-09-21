// models/Logistics.js — a demo transport option between two locations.
import mongoose from 'mongoose';

const logisticsSchema = new mongoose.Schema({
  source: { type: String, required: true },
  destination: { type: String, required: true },
  distanceKm: Number,
  vehicleType: String,          // e.g. "Mini Truck"
  costPerKg: Number,
  etaHoursMin: Number,
  etaHoursMax: Number,
}, { timestamps: true });

export default mongoose.model('Logistics', logisticsSchema);
