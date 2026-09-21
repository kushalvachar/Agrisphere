// controllers/storageController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Storage from '../models/Storage.js';
import Farmer from '../models/Farmer.js';
import { getFarmerToMarketDistanceKm } from '../services/geoService.js';

// GET /api/storage?lat=&lng=&farmerId=&radiusKm=50|100|200|500
// Phase 10: Storage & Warehouse Discovery. The facility directory itself
// (name/capacity/location) is reference/master data — the kind a real
// deployment would source from a warehouse-operator registry (e.g. WDRA)
// rather than compute — but distance, "nearby" filtering, and sort
// order are all computed live here from the requester's real location,
// exactly like Phase 4's market discovery, rather than using the
// facility's own static distanceKm field.
export const listStorage = asyncHandler(async (req, res) => {
  const { lat, lng, farmerId } = req.query;
  const radiusKm = [50, 100, 200, 500].includes(Number(req.query.radiusKm)) ? Number(req.query.radiusKm) : null;

  let location = null;
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    location = { lat: Number(lat), lng: Number(lng) };
  } else if (farmerId) {
    const farmer = await Farmer.findById(farmerId).lean();
    if (farmer?.location) location = farmer.location;
  }

  const facilities = await Storage.find({}).lean();

  if (!location) {
    // No real location available — fall back to the facility's own
    // static distanceKm field for ordering only (spec's original
    // behavior), clearly distinct from the "real distance computed"
    // path above.
    return res.json({ success: true, facilities: facilities.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)), locationSource: 'none' });
  }

  const withDistance = await Promise.all(facilities.map(async (f) => {
    const resolved = await getFarmerToMarketDistanceKm(location, { name: f.location }).catch(() => null);
    return { ...f, distanceKm: resolved?.distanceKm ?? f.distanceKm ?? null };
  }));

  let result = withDistance;
  if (radiusKm) result = result.filter((f) => f.distanceKm != null && f.distanceKm <= radiusKm);
  result.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));

  res.json({ success: true, facilities: result, radiusKm, locationSource: lat != null ? 'geolocation' : 'farmerProfile' });
});
