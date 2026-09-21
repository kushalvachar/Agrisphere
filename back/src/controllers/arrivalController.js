// controllers/arrivalController.js — Feature 1: Arrival Volume Intelligence
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getArrivalTrend } from '../services/arrivalVolumeService.js';
import { getArrivalVolumeInsight } from '../services/geminiService.js';

// GET /api/arrivals?crop=Tomato&market=Kolar APMC
export const getArrivals = asyncHandler(async (req, res) => {
  const { crop, market } = req.query;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const { series, stats, message } = await getArrivalTrend({ crop, market });
  if (!stats) return res.json({ success: true, series: [], stats: null, message });

  const aiInsight = await getArrivalVolumeInsight({ crop, market, stats });

  res.json({ success: true, series, stats, aiInsight });
});