// controllers/translateController.js
// POST /api/translate — bulk string translation for the frontend's UI
// dictionary (LanguageContext.jsx). Proxies to JigsawStack server-side
// so the API key never reaches the browser; batches up to 100 strings
// per upstream request (see translateService.js).
import { asyncHandler } from '../middleware/asyncHandler.js';
import { translateBatch } from '../services/translateService.js';

export const translateStrings = asyncHandler(async (req, res) => {
  const { texts, targetLang } = req.body || {};

  if (!Array.isArray(texts) || !texts.length) {
    return res.status(400).json({ success: false, message: 'texts must be a non-empty array of strings' });
  }
  if (!targetLang) {
    return res.status(400).json({ success: false, message: 'targetLang is required' });
  }

  const translations = await translateBatch(texts, targetLang);
  res.json({ success: true, translations });
});