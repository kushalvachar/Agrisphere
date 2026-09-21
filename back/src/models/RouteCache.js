// models/RouteCache.js
import mongoose from 'mongoose';

const routeCacheSchema = new mongoose.Schema(
  {
    routeKey: { type: String, required: true, unique: true, index: true },
    distanceKm: { type: Number, required: true },
    method: { type: String, enum: ['osrm', 'haversine'], required: true },
  },
  { timestamps: true }
);

export default mongoose.model('RouteCache', routeCacheSchema);