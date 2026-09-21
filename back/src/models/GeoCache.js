// models/GeoCache.js
import mongoose from 'mongoose';

const geoCacheSchema = new mongoose.Schema(
  {
    queryKey: { type: String, required: true, unique: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    displayName: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('GeoCache', geoCacheSchema);