// models/User.js — Phase 5: Buyer + FPO + Farmer Authentication.
//
// One login identity per person/organization, separate from the
// existing Farmer/Buyer profile documents (which hold the domain data
// those roles already worked with). `profileModel`/`profileId` point
// at whichever profile document this account owns — Farmer, FPO, or
// Buyer — so the rest of the app's existing farmerId/buyer-name-based
// code keeps working unchanged; auth just sits in front of it.
import mongoose from 'mongoose';

const ROLES = ['farmer', 'fpo', 'buyer'];

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ROLES, required: true },
  // Farmers onboard with just a phone number (spec: "simple onboarding");
  // FPOs/Buyers are business entities and register with an email.
  // Exactly one of these should be set for a given account, enforced in
  // authController rather than here so the error message can be role-aware.
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  profileModel: { type: String, enum: ['Farmer', 'FPO', 'Buyer'], required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'profileModel' },
}, { timestamps: true });

userSchema.statics.ROLES = ROLES;

export default mongoose.model('User', userSchema);
