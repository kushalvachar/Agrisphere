// controllers/shipmentController.js — Phase 8: Logistics Transparency.
import { asyncHandler } from '../middleware/asyncHandler.js';
import Shipment from '../models/Shipment.js';
import Transaction from '../models/Transaction.js';

// Deterministic progress estimate derived from real status transitions
// and how many real checkpoints have been logged — not simulated GPS.
// This is an honest stand-in for "route progress %" until a real
// telematics/GPS integration exists.
function computeProgressPct(shipment) {
  const base = { CREATED: 0, VEHICLE_ASSIGNED: 15, PICKUP_CONFIRMED: 30, IN_TRANSIT: 40, DELIVERED: 100 }[shipment.status] || 0;
  if (shipment.status === 'IN_TRANSIT') {
    return Math.min(90, base + shipment.checkpoints.length * 10);
  }
  return base;
}

function withProgress(shipment) {
  return { ...shipment, progressPct: computeProgressPct(shipment) };
}

// POST /api/shipments  { transactionId, origin, destination, distanceKm }
// Requires a REAL, existing transaction — a shipment can never be
// created detached from an actual deal (spec: "linked to actual
// transaction records", "No fake transactions").
export const createShipment = asyncHandler(async (req, res) => {
  const { transactionId, origin, destination, distanceKm } = req.body;
  if (!transactionId) return res.status(400).json({ success: false, message: 'transactionId is required' });

  const transaction = await Transaction.findById(transactionId).lean();
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

  const existing = await Shipment.findOne({ transactionId });
  if (existing) return res.json({ success: true, shipment: withProgress(existing.toObject()) });

  const shipment = await Shipment.create({
    transactionId,
    route: { origin, destination, distanceKm },
    history: [{ status: 'CREATED' }],
  });
  res.status(201).json({ success: true, shipment: withProgress(shipment.toObject()) });
});

// GET /api/shipments/by-transaction/:transactionId
export const getShipmentByTransaction = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({ transactionId: req.params.transactionId }).lean();
  if (!shipment) return res.json({ success: true, shipment: null });
  res.json({ success: true, shipment: withProgress(shipment) });
});

// PATCH /api/shipments/:id/vehicle  { vehicleType, registrationNumber, driverName, driverPhone, etaAt }
export const assignVehicle = asyncHandler(async (req, res) => {
  const { vehicleType, registrationNumber, driverName, driverPhone, etaAt } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

  shipment.vehicle = { type: vehicleType, registrationNumber };
  shipment.driver = { name: driverName, phone: driverPhone };
  if (etaAt) shipment.etaAt = new Date(etaAt);
  shipment.status = 'VEHICLE_ASSIGNED';
  shipment.history.push({ status: 'VEHICLE_ASSIGNED' });
  await shipment.save();
  res.json({ success: true, shipment: withProgress(shipment.toObject()) });
});

// PATCH /api/shipments/:id/pickup
export const confirmPickup = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

  shipment.status = 'PICKUP_CONFIRMED';
  shipment.history.push({ status: 'PICKUP_CONFIRMED' });
  if (shipment.route?.origin) shipment.checkpoints.push({ location: shipment.route.origin, note: 'Pickup confirmed' });
  await shipment.save();
  res.json({ success: true, shipment: withProgress(shipment.toObject()) });
});

// POST /api/shipments/:id/checkpoints  { location, note }
export const addCheckpoint = asyncHandler(async (req, res) => {
  const { location, note } = req.body;
  if (!location) return res.status(400).json({ success: false, message: 'location is required' });

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

  shipment.checkpoints.push({ location, note });
  if (shipment.status !== 'IN_TRANSIT' && shipment.status !== 'DELIVERED') {
    shipment.status = 'IN_TRANSIT';
    shipment.history.push({ status: 'IN_TRANSIT' });
  }
  await shipment.save();
  res.json({ success: true, shipment: withProgress(shipment.toObject()) });
});

// PATCH /api/shipments/:id/deliver
export const markDelivered = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

  shipment.status = 'DELIVERED';
  shipment.history.push({ status: 'DELIVERED' });
  if (shipment.route?.destination) shipment.checkpoints.push({ location: shipment.route.destination, note: 'Delivered' });
  await shipment.save();

  // Keep the parent Transaction's own status in sync — both records
  // describe the same real deal, so a real delivery event should be
  // reflected in both rather than only in the shipment sub-system.
  await Transaction.findByIdAndUpdate(shipment.transactionId, {
    $set: { status: 'DELIVERED' },
    $push: { history: { status: 'DELIVERED' } },
  });

  res.json({ success: true, shipment: withProgress(shipment.toObject()) });
});
