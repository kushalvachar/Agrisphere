// controllers/channelController.js — Feature 5: Multi-Channel Market Comparison
import { asyncHandler } from '../middleware/asyncHandler.js';
import { compareChannels } from '../services/multiChannelService.js';

// GET /api/channels/compare?crop=Tomato&quantityTonnes=10&grade=A
export const getChannelComparison = asyncHandler(async (req, res) => {
  const { crop, quantityTonnes, grade } = req.query;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const result = await compareChannels({
    crop,
    quantityTonnes: quantityTonnes ? Number(quantityTonnes) : undefined,
    grade,
  });

  res.json({ success: true, ...result });
});