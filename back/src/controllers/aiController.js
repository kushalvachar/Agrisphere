// controllers/aiController.js
import { asyncHandler } from '../middleware/asyncHandler.js';
import { answerFarmerQuestion, interpretVoiceCommand } from '../services/geminiService.js';
import { getLiveMarketSnapshot } from '../services/marketSnapshotService.js';

// Small in-memory TTL cache for POST /api/ai/interpret — mirrors the
// MarketPriceCache-style TTL pattern already used in
// services/marketCacheService.js, kept local here since this cache is
// small, short-lived, and specific to this one endpoint (repeated
// voice commands like "open dashboard" / "go to Ramesh" shouldn't
// re-hit Gemini every time). Swap for a Mongo-backed cache if this
// ever needs to survive a restart or be shared across instances.
const INTERPRET_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const interpretCache = new Map(); // normalizedTranscript+lang -> { value, expiresAt }

function getCachedInterpretation(key) {
  const entry = interpretCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { interpretCache.delete(key); return null; }
  return entry.value;
}
function setCachedInterpretation(key, value) {
  interpretCache.set(key, { value, expiresAt: Date.now() + INTERPRET_CACHE_TTL_MS });
}
function normalizeTranscript(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

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

  // Feature: "AI should be knowing the market details" — a live price
  // snapshot is fetched and attached on EVERY call, not just when the
  // frontend's own page context already happens to include market
  // data. This is what lets a voice/chat question asked from anywhere
  // in the app (not only the Market Intelligence page) get answered
  // for real instead of falling back to "I don't have enough data".
  // Narrowing by the farmer's own crop when we can tell what it is
  // (VoiceAssistWidget sends it as context.farmerProfile.crop; the
  // Farmer Dashboard sends the full profile as context.farmer) gives a
  // more useful top-5-markets-for-my-crop snapshot; otherwise a
  // general best-price-per-crop snapshot across all demo crops is used.
  const crop = context?.farmerProfile?.crop || context?.farmer?.currentCrop?.crop || context?.crop || undefined;
  let liveMarketSnapshot = [];
  try {
    liveMarketSnapshot = await getLiveMarketSnapshot({ crop });
  } catch (err) {
    console.warn('askAssistant: live market snapshot lookup failed —', err.message);
  }

  const enrichedContext = { ...(context || {}), liveMarketSnapshot };
  const result = await answerFarmerQuestion(question, enrichedContext, language || 'English');
  res.json({ success: true, ...result });
});

// POST /api/ai/interpret  { transcript, language, navTargets, farmerNames }
// Fallback voice-command interpreter — the "browser acts as agent"
// piece. Only called by the frontend when local keyword detection
// (voice/actionEngine.js) returns ASK_AI/EMPTY for an utterance that
// still looks command-shaped; see
// context/VoiceAssistantContext.jsx's handleUtterance /
// interpretViaAI. actionEngine.js itself still runs first on every
// utterance — free and instant — so this endpoint is only hit for the
// minority of phrasings/languages it doesn't cover.
export const interpretCommand = asyncHandler(async (req, res) => {
  const { transcript, language, navTargets, farmerNames } = req.body;
  if (!transcript) return res.status(400).json({ success: false, message: 'transcript is required' });

  const cacheKey = `${normalizeTranscript(transcript)}::${language || 'English'}`;
  const cached = getCachedInterpretation(cacheKey);
  if (cached) return res.json({ success: true, ...cached, cached: true });

  const result = await interpretVoiceCommand({
    transcript,
    language: language || 'English',
    navTargets: navTargets || [],
    farmerNames: farmerNames || [],
  });
  setCachedInterpretation(cacheKey, result);
  res.json({ success: true, ...result });
});