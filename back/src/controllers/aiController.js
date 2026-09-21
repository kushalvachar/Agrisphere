// controllers/aiController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import { answerFarmerQuestion } from '../services/geminiService.js';

// POST /api/ai/ask  { question, context, language }
// `context` is application data the frontend already has on screen
// (market comparison, buyer matches, recommendation, etc.) — the
// assistant is only allowed to reason over this, never invent numbers.
// `language` is the human-readable name of the farmer's selected app
// language (e.g. "Hindi") so the voice assistant can speak the answer
// back in the same language the question was asked in.
export const askAssistant = asyncHandler(async (req, res) => {
  const { question, context, language } = req.body;
  if (!question) return res.status(400).json({ success: false, message: 'question is required' });

  const result = await answerFarmerQuestion(question, context || {}, language || 'English');
  res.json({ success: true, ...result });
});
