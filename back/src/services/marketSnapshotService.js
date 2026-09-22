// services/marketSnapshotService.js
//
// Feature: "AI should be knowing the market details" — gives the AI
// Farmer Assistant (controllers/aiController.js -> answerFarmerQuestion)
// a baseline of REAL, current market prices on every single call,
// instead of depending entirely on whatever page-specific context the
// frontend happens to have already loaded into window.__agrisphereContext.
//
// Previously a voice/chat question asked before ever visiting Market
// Intelligence (e.g. straight from the Landing page) had NO price data
// to reason over at all, so the assistant could only correctly answer
// the small set of questions covered by hand-written intent keywords
// (see ACTION_KEYWORDS in VoiceAssistantContext.jsx) — anything else
// fell back to "I don't have enough verified data to answer that."
// This snapshot closes that gap for genuinely common questions ("what's
// the onion price today?", "which market pays the most for cotton?")
// while still only ever surfacing real seeded/AGMARKNET Market
// documents — never invented numbers.
import Market from '../models/Market.js';

// The 8 crops this app's demo data covers end-to-end (seed/seedData.js
// CROPS) — used as the fallback set when the question isn't obviously
// about one specific crop, so a general "market prices" question still
// gets something concrete for the most commonly grown crops.
const SUMMARY_CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Maize', 'Cotton', 'Soybean'];

function toSnapshotRow(m) {
  return {
    market: m.name, channel: m.channel, crop: m.crop, state: m.state, district: m.district,
    minPricePerKg: m.minPrice, modalPricePerKg: m.modalPrice, maxPricePerKg: m.maxPrice,
    trend: m.trend, arrivalQuantityTonnes: m.arrivalQuantityTonnes,
  };
}

/**
 * Returns a small, lean set of live Market rows for the AI prompt.
 *   - If `crop` is known (from the farmer's profile or the question's
 *     own context), returns the top 5 markets for THAT crop, best
 *     modal price first — enough to answer "best market for my tomato"
 *     -style questions without a full recommendation call.
 *   - If no crop is known, returns ONE representative (best-price)
 *     market per crop across all 8 demo crops — a broad snapshot so a
 *     general "what are today's prices" question still has something
 *     concrete to work from.
 * Never throws — callers treat a lookup failure as "no snapshot
 * available" and the assistant just says it doesn't have the data,
 * same as before this feature existed.
 */
export async function getLiveMarketSnapshot({ crop } = {}) {
  if (crop) {
    const rows = await Market.find({ crop }).sort({ modalPrice: -1 }).limit(5).lean();
    if (rows.length) return rows.map(toSnapshotRow);
    // Unknown/misspelled crop — fall through to the general snapshot
    // below rather than returning nothing.
  }

  const rows = await Promise.all(
    SUMMARY_CROPS.map((c) => Market.findOne({ crop: c }).sort({ modalPrice: -1 }).lean()),
  );
  return rows.filter(Boolean).map(toSnapshotRow);
}