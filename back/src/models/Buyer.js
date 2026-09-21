// models/Buyer.js — a demo buyer/FPO-aggregator with an open offer.
//
// Feature 4 (Institutional Buyer Integration): `buyerType` and `channel`
// distinguish plain traders/wholesalers from institutional buyers
// (processors, retail chains, exporters, government procurement
// agencies), and `requirements` captures the extra quantity/quality/
// delivery conditions institutional buyers typically impose.
//
// Feature 5 (Multi-Channel Market Comparison): `channel` is also the
// field the multi-channel comparison service groups by, alongside
// Market.channel, so APMC/eNAM/Processor/Exporter/Retail/Digital
// Marketplace opportunities can be ranked side by side.
import mongoose from 'mongoose';

const BUYER_TYPES = ['Trader/Aggregator', 'Processor', 'Retail Chain', 'Exporter', 'Government Agency'];
const CHANNELS = ['Direct Trader', 'Processor', 'Retail Chain', 'Exporter', 'Government Procurement', 'Digital Marketplace'];

const requirementsSchema = new mongoose.Schema({
  qualitySpec: String,          // e.g. "Grade A, uniform size, <5% defects"
  // Phase 7: structured quality requirement fields (in addition to the
  // free-text qualitySpec above) — what the AI-assisted quality
  // submission a farmer/FPO makes against this offer is compared to.
  gradeRequired: String,        // e.g. "A"
  maxMoisturePct: Number,
  sizeSpec: String,             // e.g. "50-65mm"
  minPurityPct: Number,
  deliverySchedule: String,     // e.g. "Weekly, Mon/Thu dispatch"
  packagingRequirement: String, // e.g. "25kg crates, ventilated"
  contractType: String,         // e.g. "Spot", "Seasonal Contract", "Forward Agreement"
}, { _id: false });

const buyerSchema = new mongoose.Schema({
  // Phase 5: set once a buyer registers a real account (KYC fields
  // below). Nullable — pre-existing demo buyer records have no account.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  gstin: String,                      // validated via services/gstinService.js at registration
  gstinValid: Boolean,                // result of that structural/checksum check (not a live GSTN lookup — see gstinService.js)
  businessDetails: {
    businessName: String,
    businessType: String,             // e.g. "Proprietorship", "Private Limited", "Partnership"
    contactPerson: String,
    email: String,
  },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verificationNote: String,
  name: { type: String, required: true },          // clearly fictional demo names
  buyerType: { type: String, enum: BUYER_TYPES, default: 'Trader/Aggregator' },
  channel: { type: String, enum: CHANNELS, default: 'Direct Trader' },
  // A freshly registered buyer (Phase 5) hasn't posted a produce
  // requirement yet — that comes later via Buyer Demand Posting
  // (Phase 6) — so this is no longer required at the schema level.
  cropRequired: { type: String },
  gradeRequired: String,
  quantityRequiredTonnes: Number,
  offerPricePerKg: Number,
  location: String,
  distanceKm: Number,
  // Phase 6: Buyer Demand Posting. deliveryLocation is where the buyer
  // wants produce delivered (may differ from `location`, the buyer's
  // registered address); budgetPerKg is the ceiling price backing
  // offerPricePerKg — kept separate so a buyer can post a soft budget
  // above their opening offer without changing the number farmers see.
  deliveryLocation: String,
  budgetPerKg: Number,
  requiredByDate: Date,
  verified: { type: Boolean, default: true },
  paymentReliabilityPct: Number,     // 0-100, used in trust score
  completedTransactions: Number,
  disputedTransactionsPct: Number,   // 0-100
  requirements: requirementsSchema,  // only meaningfully populated for institutional buyers
  isDemoData: { type: Boolean, default: true },
}, { timestamps: true });

buyerSchema.statics.BUYER_TYPES = BUYER_TYPES;
buyerSchema.statics.CHANNELS = CHANNELS;

export default mongoose.model('Buyer', buyerSchema);