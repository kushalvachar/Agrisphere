// models/Farmer.js — a farmer's profile + current crop lot they want to sell.
import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
  // Phase 5: set once a farmer registers a real account. Nullable —
  // the pre-existing demo/seeded farmers (and the /demo path) have no
  // account and keep working exactly as before.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  location: {
    village: String,
    district: String,
    state: String,
    lat: Number,
    lng: Number,
  },
  phone: String,
  currentCrop: {
    crop: String,
    quantityTonnes: Number,
    grade: String, // A, B, C
    storageAvailable: Boolean,
  },
}, { timestamps: true });

export default mongoose.model('Farmer', farmerSchema);
