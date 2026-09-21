// models/FPO.js — Phase 5: FPO registration + verification workflow.
//
// verificationStatus starts 'pending' on registration (spec: "FPO:
// Registration details, verification workflow") — there is no back-office
// admin role in this codebase yet, so PATCH /api/auth/fpo/:id/verify
// (authController.reviewFpo) is the extension point a future admin panel
// would call. It is left open/unauthenticated for now, clearly commented
// there as a placeholder, rather than fabricating an admin role that
// doesn't otherwise exist in the app.
import mongoose from 'mongoose';

const fpoSchema = new mongoose.Schema({
  organizationName: { type: String, required: true },
  registrationNumber: { type: String, required: true }, // e.g. FPO/cooperative registration no. — format not standardized nationally, stored as given
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  location: {
    village: String,
    district: String,
    state: String,
  },
  memberCount: Number,
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verificationNote: String,
}, { timestamps: true });

export default mongoose.model('FPO', fpoSchema);
