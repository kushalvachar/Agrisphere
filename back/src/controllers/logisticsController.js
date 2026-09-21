// controllers/logisticsController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import Logistics from '../models/Logistics.js';

// GET /api/logistics?destination=Bengaluru
export const listLogistics = asyncHandler(async (req, res) => {
  const { source, destination } = req.query;
  const query = {};
  if (source) query.source = source;
  if (destination) query.destination = destination;

  const options = await Logistics.find(query).lean();
  res.json({ success: true, options });
});
