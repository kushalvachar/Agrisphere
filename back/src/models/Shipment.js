// models/Shipment.js — Phase 8: Logistics Transparency Platform.
//
// Distinct from the pre-existing Logistics model (which is just a
// source→destination rate/ETA reference table used for cost estimates).
// A Shipment is the real, live tracking record for ONE actual
// Transaction — it does not exist until a real transaction does
// (transactionId is required and unique), so there is no way to create
// a "fake" shipment detached from a real deal.
//
// Status flow matches the spec exactly:
//   CREATED → VEHICLE_ASSIGNED → PICKUP_CONFIRMED → IN_TRANSIT → DELIVERED
// with checkpoints appended along the way (real updates the farmer/buyer
// make, not simulated GPS pings — there's no GPS hardware in this
// prototype, so checkpoints are manually logged location+note entries,
// which is an honest stand-in until a real telematics/GPS integration
// is added).
import mongoose from 'mongoose';

const STATUSES = ['CREATED', 'VEHICLE_ASSIGNED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];

const checkpointSchema = new mongoose.Schema({
  location: { type: String, required: true },
  note: String,
  at: { type: Date, default: Date.now },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
  status: { type: String, enum: STATUSES, default: 'CREATED' },
  vehicle: {
    type: { type: String },        // e.g. "Mini Truck", "Tempo"
    registrationNumber: String,
  },
  driver: {
    name: String,
    phone: String,
  },
  route: {
    origin: String,
    destination: String,
    distanceKm: Number,
  },
  checkpoints: [checkpointSchema],
  etaAt: Date,
  history: [{ status: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

shipmentSchema.statics.STATUSES = STATUSES;

export default mongoose.model('Shipment', shipmentSchema);
