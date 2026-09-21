// controllers/demandForecastController.js — Feature 2: Buyer Demand Forecasting
import { asyncHandler } from '../middleware/asyncHandler.js';
import { forecastDemand } from '../services/demandForecastService.js';
import { getDemandForecastExplanation } from '../services/geminiService.js';

// GET /api/demand-forecast?crop=Tomato&buyerName=ABC Foods (Demo)
export const getDemandForecast = asyncHandler(async (req, res) => {
  const { crop, buyerName } = req.query;
  if (!crop) return res.status(400).json({ success: false, message: 'crop is required' });

  const { forecast, history, message } = await forecastDemand({ crop, buyerName });
  if (!forecast) return res.json({ success: true, forecast: null, message });

  const aiExplanation = await getDemandForecastExplanation({ forecast, recentHistory: history.slice(-6) });

  res.json({ success: true, forecast, history, aiExplanation });
});