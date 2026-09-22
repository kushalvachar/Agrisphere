// ai/prompts/voiceCommandInterpreter.js
//
// Fallback interpreter for the voice assistant's "browser acts as
// agent" pipeline (POST /api/ai/interpret). Local, free, instant
// keyword detection (voice/actionEngine.js's detectAction()) always
// runs FIRST and handles the vast majority of utterances; this prompt
// is only reached when local detection returns ASK_AI or EMPTY for
// something that LOOKS like a command rather than a genuine question —
// i.e. for the 5+ languages/phrasings the local keyword table doesn't
// cover (see context/VoiceAssistantContext.jsx's handleUtterance).
//
// IMPORTANT: the "intent" strings below must stay in lockstep with the
// INTENTS enum in voice/actionEngine.js. If that enum changes (a new
// intent added/renamed), update this list to match.
export function buildVoiceCommandInterpreterPrompt({
  transcript,
  language = 'English',
  navTargets = [],
  farmerNames = [],
}) {
  return `You are AgriSphere AI's voice command interpreter. A farmer (or FPO staff
member) spoke a short voice command in ${language}. Your ONLY job is to classify it
into ONE of the fixed intents below and extract any parameters — you do NOT answer
questions, explain anything, or add commentary.

AVAILABLE INTENTS (respond with EXACTLY one of these strings, nothing else):
- "OPEN_DASHBOARD" — go to the main dashboard
- "OPEN_MARKET_INTELLIGENCE" — open the market intelligence / prices page (params: { crop? })
- "OPEN_BUYER_DEMAND" — open buyer discovery
- "OPEN_OFFERS" — open the offers page
- "OPEN_TRANSACTIONS" — open the transactions page
- "OPEN_ANALYTICS" — open the analytics page
- "OPEN_AI_CHAT" — open the AI assistant chat page
- "OPEN_PROFILE" — open profile
- "OPEN_SETTINGS" — open settings
- "OPEN_FPO_SECTION" — open the FPO section
- "OPEN_NAMED_DASHBOARD" — open a SPECIFIC named farmer's dashboard, e.g. "open Ramesh's
  dashboard" or "go to Ramesh" (params: { name: string })
- "SHOW_MARKET_PRICES" — show prices for a crop (params: { crop? })
- "SHOW_TREND" — show the price trend for a crop (params: { crop? })
- "SHOW_NEAREST_MARKET" — show the nearest market for a crop (params: { crop? })
- "SHOW_BEST_MARKET" — find the best market/recommendation for the farmer's own crop
- "RUN_SMART_MATCHING" — run buyer smart matching
- "SHOW_MATCH_RESULTS" — show existing match results
- "CHANGE_LANGUAGE" — switch the app language (params: { languageCode: one of en|hi|kn|ta|te|ml|mr|bn|gu|pa })
- "SHOW_MY_CROPS" — show the farmer's own crop info
- "SHOW_MY_LOTS" — show the farmer's/FPO's lots
- "HELP" — general help / "what can you do"
- "EXPLAIN_WHY" — re-explain the last recommendation ("why?")
- "EMPTY" — not a recognizable command. The caller has ALREADY determined this
  transcript looks command-shaped, so only use EMPTY if truly nothing above fits —
  prefer a real intent whenever remotely plausible.

${navTargets.length ? `Nav targets currently available on this page: ${navTargets.join(', ')}` : ''}
${farmerNames.length ? `Known farmer names, for OPEN_NAMED_DASHBOARD matching only — pick the closest name actually mentioned in the transcript, copy it back EXACTLY as spelled here, and never invent a name that isn't in this list: ${farmerNames.join(', ')}` : ''}

VOICE COMMAND TRANSCRIPT:
"${transcript}"

Respond ONLY with JSON, no markdown fences:
{
  "intent": string,
  "params": object
}`;
}