// controllers/ivrController.js — Enhancement 3 (Multi-language + IVR).
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getIvrMenu, getPriceReadout, getOfferReadout, getGoodbye, SUPPORTED_LANGUAGES } from '../services/ivrService.js';

// GET /api/ivr/menu?lang=hi
export const menu = asyncHandler(async (req, res) => {
  res.json({ success: true, ...getIvrMenu(req.query.lang) });
});

// POST /api/ivr/prices  { lang, crop }
export const prices = asyncHandler(async (req, res) => {
  const result = await getPriceReadout(req.body.lang, req.body.crop);
  res.json({ success: true, ...result });
});

// POST /api/ivr/offers  { lang, crop }
export const offers = asyncHandler(async (req, res) => {
  const result = await getOfferReadout(req.body.lang, req.body.crop);
  res.json({ success: true, ...result });
});

// GET /api/ivr/goodbye?lang=kn
export const goodbye = asyncHandler(async (req, res) => {
  const text = await getGoodbye(req.query.lang);
  res.json({ success: true, text, languages: SUPPORTED_LANGUAGES });
});