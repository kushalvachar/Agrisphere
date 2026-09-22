// voice/actionEngine.js — Feature: Multilingual Voice AGENT (not just a
// Q&A assistant). Pure, dependency-free intent detection: given a
// speech-recognized transcript + the currently active language, returns
// a STRUCTURED action `{ intent, params }` using the exact intent names
// the product spec defines, e.g.:
//   detectAction("Run smart matching", 'en')        -> { intent: 'RUN_SMART_MATCHING' }
//   detectAction("Show tomato prices", 'en')         -> { intent: 'SHOW_MARKET_PRICES', params: { crop: 'Tomato' } }
//   detectAction("ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ", 'en')          -> { intent: 'CHANGE_LANGUAGE', params: { languageCode: 'kn' } }
//
// Kept as a standalone module (no React, no hooks, no navigation) so it
// can be unit-tested in isolation and so the ACTUAL execution of an
// action — which needs navigate(), speak(), API calls, refs — lives
// separately in context/VoiceAssistantContext.jsx's ACTION_EXECUTORS,
// which only has to `switch` on these intent names.
//
// Level 1 / Level 2 hybrid (spec's "Intent Detection Strategy"): THIS
// module is Level 1 — fast, local, zero network calls, covers every
// intent below. Anything it can't classify falls through to intent
// 'ASK_AI', which the context routes to the existing Gemini-backed
// /api/ai/ask endpoint (Level 2) — that endpoint already understands
// free-form questions in any of the 10 languages and answers in kind
// (see controllers/aiController.js), so Level 2 needs no changes here.

export const INTENTS = Object.freeze({
  // Navigation
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',
  OPEN_MARKET_INTELLIGENCE: 'OPEN_MARKET_INTELLIGENCE',
  OPEN_BUYER_DEMAND: 'OPEN_BUYER_DEMAND',
  OPEN_PROFILE: 'OPEN_PROFILE',
  OPEN_FPO_SECTION: 'OPEN_FPO_SECTION',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  // Bonus navigation targets this app has that the spec's fixed list
  // doesn't name (Offers, Transactions, Analytics, the AI chat page) —
  // kept as their own intents rather than silently dropped, since the
  // nav.* nav bundle already makes them free to detect in every
  // language (see NAV_TARGET_TO_INTENT below).
  OPEN_OFFERS: 'OPEN_OFFERS',
  OPEN_TRANSACTIONS: 'OPEN_TRANSACTIONS',
  OPEN_ANALYTICS: 'OPEN_ANALYTICS',
  OPEN_AI_CHAT: 'OPEN_AI_CHAT',
  // Open another farmer's dashboard by name, e.g. "open Ravi's dashboard"
  // or "go to Ravi". Level 1 only CAPTURES the trailing name string as
  // params.name — it does NOT look up or validate that a farmer by that
  // name exists (no data access here, this module stays dependency-free
  // and network-free). Resolving the name to an actual farmer record is
  // the execution layer's job (context/VoiceAssistantContext.jsx's
  // ACTION_EXECUTORS), which can look it up, disambiguate, or tell the
  // user no match was found.
  OPEN_NAMED_DASHBOARD: 'OPEN_NAMED_DASHBOARD',
  // Market
  SHOW_MARKET_PRICES: 'SHOW_MARKET_PRICES',
  SHOW_TREND: 'SHOW_TREND',
  SHOW_NEAREST_MARKET: 'SHOW_NEAREST_MARKET',
  SHOW_BEST_MARKET: 'SHOW_BEST_MARKET',
  // Matching
  RUN_SMART_MATCHING: 'RUN_SMART_MATCHING',
  SHOW_MATCH_RESULTS: 'SHOW_MATCH_RESULTS',
  // Language
  CHANGE_LANGUAGE: 'CHANGE_LANGUAGE',
  // Profile
  SHOW_MY_CROPS: 'SHOW_MY_CROPS',
  SHOW_MY_LOTS: 'SHOW_MY_LOTS',
  // General
  HELP: 'HELP',
  // Bonus (pre-existing "Assistant Memory" feature, kept alongside the
  // spec's own intents rather than removed): re-explain the last
  // SHOW_BEST_MARKET / RUN_SMART_MATCHING result without redoing the
  // whole lookup.
  EXPLAIN_WHY: 'EXPLAIN_WHY',
  // Level 2 fallback + empty input
  ASK_AI: 'ASK_AI',
  EMPTY: 'EMPTY',
});

// Language name recognition for CHANGE_LANGUAGE — checked against ALL
// 10 languages regardless of the transcript's OWN language, since a
// farmer currently in Kannada might say "Switch to Hindi" (an English
// language name inside an otherwise-English sentence), or a Hindi
// speaker might say the Kannada name for Kannada. Includes each
// language's own native name, its common English spelling, and (where
// distinct) the Hindi word for it, since "language" instructions are
// very often given in Hindi or English regardless of the target.
const LANGUAGE_NAME_ALIASES = {
  en: ['english', 'ಇಂಗ್ಲಿಷ್', 'अंग्रेज़ी', 'अंग्रेजी'],
  hi: ['hindi', 'हिन्दी', 'हिंदी', 'ಹಿಂದಿ'],
  kn: ['kannada', 'ಕನ್ನಡ', 'कन्नड़'],
  ta: ['tamil', 'தமிழ்', 'तमिल', 'ತಮಿಳು'],
  te: ['telugu', 'తెలుగు', 'तेलुगु', 'ತೆಲುಗು'],
  ml: ['malayalam', 'മലയാളം', 'मलयालम', 'ಮಲಯಾಳಂ'],
  mr: ['marathi', 'मराठी', 'ಮರಾಠಿ'],
  bn: ['bengali', 'bangla', 'বাংলা', 'बांग्ला', 'ಬಂಗಾಳಿ'],
  gu: ['gujarati', 'ગુજરાતી', 'गुजराती', 'ಗುಜರಾತಿ'],
  pa: ['punjabi', 'ਪੰਜਾਬੀ', 'पंजाबी', 'ಪಂಜಾಬಿ'],
};

// The 8 crops this app's market data covers end-to-end (same set as
// backend seed/seedData.js CROPS and pages/MarketIntelligence.jsx).
// Localized names given for the 5 languages ACTION_KEYWORDS below
// already covers with real keyword phrases (en/hi/kn/ta/te) — see the
// "Honest limitation" note on ACTION_KEYWORDS for why the other 5
// aren't included here yet. The English name is ALWAYS also checked
// (see extractCrop) since English produce nouns are commonly used even
// mid-sentence in another language.
const CROP_NAMES = {
  en: { Tomato: 'tomato', Onion: 'onion', Potato: 'potato', Paddy: 'paddy', Wheat: 'wheat', Maize: 'maize', Cotton: 'cotton', Soybean: 'soybean' },
  hi: { Tomato: 'टमाटर', Onion: 'प्याज', Potato: 'आलू', Paddy: 'धान', Wheat: 'गेहूं', Maize: 'मक्का', Cotton: 'कपास', Soybean: 'सोयाबीन' },
  kn: { Tomato: 'ಟೊಮೇಟೊ', Onion: 'ಈರುಳ್ಳಿ', Potato: 'ಆಲೂಗಡ್ಡೆ', Paddy: 'ಭತ್ತ', Wheat: 'ಗೋಧಿ', Maize: 'ಮೆಕ್ಕೆಜೋಳ', Cotton: 'ಹತ್ತಿ', Soybean: 'ಸೋಯಾಬೀನ್' },
  ta: { Tomato: 'தக்காளி', Onion: 'வெங்காயம்', Potato: 'உருளைக்கிழங்கு', Paddy: 'நெல்', Wheat: 'கோதுமை', Maize: 'சோளம்', Cotton: 'பருத்தி', Soybean: 'சோயாபீன்' },
  te: { Tomato: 'టమాటా', Onion: 'ఉల్లిపాయ', Potato: 'బంగాళదుంప', Paddy: 'వరి', Wheat: 'గోధుమ', Maize: 'మొక్కజొన్న', Cotton: 'పత్తి', Soybean: 'సోయాబీన్' },
};

// Action-intent keyword phrases. Full coverage for the 5 languages the
// pre-existing voice assistant already hand-covered (en/hi/kn/ta/te —
// see the original ACTION_KEYWORDS this replaces/extends).
//
// Honest limitation (carried over unchanged from the previous
// implementation, now just applying to a longer intent list): a farmer
// speaking one of the other 5 supported languages (Marathi, Malayalam,
// Bengali, Gujarati, Punjabi) won't trigger these specific action
// shortcuts by keyword. They are NOT unsupported, though — navigation
// (OPEN_DASHBOARD etc., via each role's own already-translated nav.*
// label) and CHANGE_LANGUAGE both work in all 10 languages regardless
// of this table (see detectAction), and any other utterance falls
// through to ASK_AI, which the Gemini-backed endpoint answers correctly
// in the farmer's own language — it just won't trigger an in-app
// action like "run smart matching" via a keyword shortcut. Extending
// real phrase coverage to these 5 languages is future work requiring a
// native speaker review, not a guess encoded here.
const ACTION_KEYWORDS = {
  en: {
    smartMatching: ['run smart matching', 'smart matching', 'find buyers for my crop', 'match me with buyers'],
    matchResults: ['show match results', 'show my matches', 'show matching results'],
    bestMarket: [
  'best market',
  'best price',
  'where should i sell',
  'which market',
  'find best market',
  'find the best market',

  'find my best selling option',
  'best selling option',
  'best selling opportunity',
  'run best selling option',
  'analyze best selling option',
  'sell my crop',
  'where can i sell',
  'where should i sell my crop',
  'get best selling option',
  'show best selling option'
],
    trend: ['price trend', 'show trend', 'price history', 'is the price going up', 'is the price going down'],
    nearestMarket: ['nearest market', 'closest market', 'market near me'],
    marketPrices: ['show price', 'show prices', 'market price', "today's price", 'todays price', 'current price'],
    myCrops: ['my crop', 'my crops', 'show my crop', 'what is my crop'],
    myLots: ['my lot', 'my lots', 'show my lots', 'smart lot'],
    why: ['why', 'explain'],
    help: ['what can i do', 'what can you do', 'what is this app', 'what is this', 'help'],
    sellHelp: ['help me sell', 'how do i sell', 'sell my crop'],
    findBuyers: ['find buyers', 'find a buyer', 'show buyers', 'connect with buyers'],
  },
  hi: {
    smartMatching: ['स्मार्ट मैचिंग', 'खरीदार खोजो मेरे लिए', 'मुझे खरीदारों से जोड़ो'],
    matchResults: ['मैच परिणाम दिखाओ', 'मेरे मैच दिखाओ'],
    bestMarket: ['सबसे अच्छा बाजार', 'सबसे अच्छा भाव', 'कहां बेचूं', 'कहाँ बेचूं', 'बेहतर बाजार','मेरे लिए सबसे अच्छा बिक्री विकल्प',
'सबसे अच्छा बिक्री विकल्प',
'सबसे अच्छा बेचने का विकल्प',
'मेरी फसल कहाँ बेचूँ',
'बेहतर बिक्री विकल्प'],
    trend: ['भाव का रुझान', 'कीमत का रुझान', 'भाव इतिहास'],
    nearestMarket: ['नजदीकी बाजार', 'पास का बाजार'],
    marketPrices: ['भाव दिखाओ', 'आज का भाव', 'बाजार भाव'],
    myCrops: ['मेरी फसल', 'मेरी फसल दिखाओ'],
    myLots: ['मेरा लॉट', 'मेरे लॉट दिखाओ'],
    why: ['क्यों'],
    help: ['क्या कर सकते', 'यह क्या है', 'मदद करो'],
    sellHelp: ['फसल कैसे बेचें', 'बेचने में मदद'],
    findBuyers: ['खरीदार खोजो', 'खरीदार ढूंढो'],
  },
  kn: {
    smartMatching: ['ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚಿಂಗ್', 'ಖರೀದಿದಾರರೊಂದಿಗೆ ಹೊಂದಿಸಿ'],
    matchResults: ['ಹೊಂದಾಣಿಕೆ ಫಲಿತಾಂಶ ತೋರಿಸಿ'],
    bestMarket: ['ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ', 'ಎಲ್ಲಿ ಮಾರಾಟ', 'ಉತ್ತಮ ಬೆಲೆ','ಅತ್ಯುತ್ತಮ ಮಾರಾಟ ಆಯ್ಕೆ',
'ನನ್ನ ಬೆಳೆ ಎಲ್ಲಿ ಮಾರಬೇಕು',
'ಉತ್ತಮ ಮಾರಾಟ ಆಯ್ಕೆ',
'ಮಾರಾಟದ ಉತ್ತಮ ಅವಕಾಶ'],
    trend: ['ಬೆಲೆ ಪ್ರವೃತ್ತಿ', 'ಬೆಲೆ ಇತಿಹಾಸ'],
    nearestMarket: ['ಹತ್ತಿರದ ಮಾರುಕಟ್ಟೆ'],
    marketPrices: ['ಬೆಲೆ ತೋರಿಸಿ', 'ಇಂದಿನ ಬೆಲೆ'],
    myCrops: ['ನನ್ನ ಬೆಳೆ', 'ನನ್ನ ಬೆಳೆ ತೋರಿಸಿ'],
    myLots: ['ನನ್ನ ಲಾಟ್'],
    why: ['ಏಕೆ'],
    help: ['ಏನು ಮಾಡಬಹುದು', 'ಸಹಾಯ ಮಾಡಿ'],
    sellHelp: ['ಬೆಳೆ ಮಾರಾಟ ಮಾಡುವುದು ಹೇಗೆ'],
    findBuyers: ['ಖರೀದಿದಾರರನ್ನು ಹುಡುಕಿ'],
  },
  ta: {
    smartMatching: ['ஸ்மார்ட் மேட்சிங்', 'வாங்குபவர்களுடன் பொருத்து'],
    matchResults: ['பொருத்த முடிவுகளைக் காட்டு'],
    bestMarket: ['சிறந்த சந்தை', 'எங்கே விற்பது', 'சிறந்த விலை','சிறந்த விற்பனை விருப்பம்',
'என் பயிரை எங்கே விற்கலாம்',
'சிறந்த விற்பனை வாய்ப்பு'],
    trend: ['விலை போக்கு', 'விலை வரலாறு'],
    nearestMarket: ['அருகிலுள்ள சந்தை'],
    marketPrices: ['விலை காட்டு', 'இன்றைய விலை'],
    myCrops: ['என் பயிர்', 'என் பயிரை காட்டு'],
    myLots: ['என் லாட்'],
    why: ['ஏன்'],
    help: ['என்ன செய்ய முடியும்', 'உதவி'],
    sellHelp: ['பயிரை விற்பது எப்படி'],
    findBuyers: ['வாங்குபவர்களை தேடு'],
  },
  te: {
    smartMatching: ['స్మార్ట్ మ్యాచింగ్', 'కొనుగోలుదారులతో సరిపోల్చండి'],
    matchResults: ['మ్యాచ్ ఫలితాలు చూపించు'],
    bestMarket: ['ఉత్తమ మార్కెట్', 'ఎక్కడ అమ్మాలి', 'ఉత్తమ ధర','ఉత్తమ అమ్మకపు ఎంపిక',
'నా పంట ఎక్కడ అమ్మాలి',
'మంచి అమ్మకపు అవకాశం'],
    trend: ['ధర ధోరణి', 'ధర చరిత్ర'],
    nearestMarket: ['సమీప మార్కెట్'],
    marketPrices: ['ధర చూపించు', 'నేటి ధర'],
    myCrops: ['నా పంట', 'నా పంట చూపించు'],
    myLots: ['నా లాట్'],
    why: ['ఎందుకు'],
    help: ['ఏమి చేయగలరు', 'సహాయం'],
    sellHelp: ['పంట ఎలా అమ్మాలి'],
    findBuyers: ['కొనుగోలుదారులను కనుగొనండి'],
  },
};

// Extra English phrasing that means a nav target even though it isn't
// that page's literal translated label — kept from the pre-existing
// implementation, unchanged.
const NAV_SYNONYMS_EN = { market: ['crop price', 'prices', 'mandi'], dashboard: ['home'] };

// Which nav.* bundle key (as already used across every layout's own
// navItems — see components/RoleLayout.jsx / Layout.jsx) maps to which
// canonical intent. Matching against each role's own ALREADY-TRANSLATED
// label (react-i18next's nav.* bundle covers all 10 languages) is what
// makes navigation work in every supported language without a second
// hand-written phrase list per page — the same design the pre-existing
// assistant already used for its smaller set of targets.
const NAV_TARGET_TO_INTENT = {
  dashboard: INTENTS.OPEN_DASHBOARD,
  market: INTENTS.OPEN_MARKET_INTELLIGENCE,
  buyers: INTENTS.OPEN_BUYER_DEMAND,
  lot: INTENTS.SHOW_MY_LOTS,
  offers: INTENTS.OPEN_OFFERS,
  transactions: INTENTS.OPEN_TRANSACTIONS,
  analytics: INTENTS.OPEN_ANALYTICS,
  assistant: INTENTS.OPEN_AI_CHAT,
};

function matchesAny(lower, phrases) {
  return (phrases || []).some((p) => lower.includes(p.toLowerCase()));
}

// Patterns for OPEN_NAMED_DASHBOARD. Two shapes, kept separate because
// they need different priority in detectAction:
//   - "possessive" ("open Ravi's dashboard") is specific enough to check
//     very early, since the literal word "dashboard" makes it unlikely
//     to collide with anything else this module detects.
//   - "go to <name>" is a bare, generic shape ("go to Ravi") that would
//     also match plain navigation phrasing ("go to dashboard", "go to
//     market") — so it's only checked in detectAction AFTER step 5's
//     nav-bundle matching has already had first refusal on known nav
//     targets.
//
// Honest limitation (same rationale as ACTION_KEYWORDS above): real
// phrase coverage here is for the 5 languages the rest of this file
// already hand-covers (en/hi/kn/ta/te). The other 5 languages simply
// fall through to ASK_AI for this pattern, same as any other action
// shortcut they don't have keywords for — extending it is future work
// requiring native-speaker review, not a guess encoded here.
const POSSESSIVE_DASHBOARD_PATTERNS = {
  en: [
    /\bopen\s+(.+?)['’]s\s+dashboard\b/i,
    /\bopen\s+(.+?)\s+dashboard\b/i, // speech recognition often drops the possessive "'s"
    /\bshow\s+(.+?)['’]s\s+dashboard\b/i,
    /\bgo to\s+(.+?)['’]s\s+dashboard\b/i,
  ],
  hi: [
    /(.+?)\s*(?:का|की|के)\s*डैशबोर्ड/,
  ],
  kn: [
    /(.+?)\s*(?:ಅವರ)\s*ಡ್ಯಾಶ್\S*ಬೋರ್ಡ್/,
  ],
  ta: [
    /(.+?)\s*இன்\s*டாஷ்போர்ட்\S*/,
  ],
  te: [
    /(.+?)\s*యొక్క\s*డాష్\S*బోర్డ్/,
  ],
};

const GO_TO_PATTERNS = {
  en: [/\bgo to\s+(.+)$/i],
  hi: [/(.+?)\s*(?:के पास|तक)\s*जाओ/],
  kn: [/(.+?)\s*ಗೆ\s*ಹೋಗಿ/],
  ta: [/(.+?)\s*க்கு\s*செல்/],
  te: [/(.+?)\s*కి\s*వెళ్ళు/],
};

// Words that mean a known nav target, not a person's name — guards the
// broad English "go to X" shape from stealing "go to dashboard" / "go to
// market" in case a role's nav bundle doesn't define that key (step 5
// would then have nothing to match against, and this would be the only
// remaining check).
const NAV_NOISE_WORDS_EN = [
  'dashboard', 'home', 'market', 'profile', 'settings', 'offers',
  'transactions', 'analytics', 'assistant', 'buyers', 'buyer demand',
  'lot', 'lots', 'help', 'fpo',
];

function titleCaseName(s) {
  return s
    .trim()
    .replace(/["'.?!,]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractPossessiveDashboardName(raw, lang) {
  // Current language first, then English as a fallback — farmers often
  // keep the word "dashboard" in English even mid-sentence in another
  // language, same rationale as extractCrop's English fallback below.
  const order = lang === 'en' ? ['en'] : [lang, 'en'];
  for (const l of order) {
    for (const re of POSSESSIVE_DASHBOARD_PATTERNS[l] || []) {
      const m = raw.match(re);
      if (m && m[1] && m[1].trim()) return titleCaseName(m[1]);
    }
  }
  return null;
}

function extractGoToName(raw, lang) {
  const order = lang === 'en' ? ['en'] : [lang, 'en'];
  for (const l of order) {
    for (const re of GO_TO_PATTERNS[l] || []) {
      const m = raw.match(re);
      if (m && m[1] && m[1].trim()) {
        const name = titleCaseName(m[1]);
        if (l === 'en' && NAV_NOISE_WORDS_EN.includes(name.toLowerCase())) continue;
        return name;
      }
    }
  }
  return null;
}

// Plain substring matching against a translated nav label works for
// English/Hindi ("Open dashboard" contains "dashboard" verbatim), but
// fails for the Dravidian languages (Tamil/Kannada/Telugu/Malayalam),
// which are agglutinative — a noun takes a case suffix depending on its
// grammatical role, e.g. Tamil "டாஷ்போர்டு" (dashboard) becomes
// "டாஷ்போர்டை" ("the dashboard", as a spoken object) in the spec's own
// example command. Falls back to matching a long stem/prefix of the
// label (first ~70% of its characters, 3-char minimum) so the base word
// still matches under a different case ending, instead of requiring the
// exact full inflected form to have been hand-written somewhere.
function labelMatches(lower, label) {
  if (!label) return false;
  const l = String(label).toLowerCase();
  if (lower.includes(l)) return true;
  const stemLen = Math.max(3, Math.floor(l.length * 0.7));
  return lower.includes(l.slice(0, stemLen));
}

function extractCrop(lower, lang) {
  const localized = CROP_NAMES[lang];
  if (localized) {
    for (const [canonical, word] of Object.entries(localized)) {
      if (lower.includes(word.toLowerCase())) return canonical;
    }
  }
  // English crop nouns are commonly used mid-sentence in any language
  // (e.g. a Hindi sentence with the English word "tomato") — always
  // checked as a fallback, not just when lang === 'en'.
  for (const [canonical, word] of Object.entries(CROP_NAMES.en)) {
    if (lower.includes(word.toLowerCase())) return canonical;
  }
  return null;
}

// Question markers that signal "this is a real question, not a bare lookup
// command" — checked across languages regardless of the transcript's own
// language, same rationale as LANGUAGE_NAME_ALIASES (e.g. a Kannada speaker
// may drop in an English "why"). Not exhaustive — see the honest-limitation
// note on ACTION_KEYWORDS above; extending full translated question-word
// coverage across all 10 languages is future work, not a guess encoded here.
const QUESTION_MARKERS = ['why', 'how', 'should', 'compare', 'எப்படி', 'ఎందుకు', 'ಏಕೆ', 'क्यों'];

// A short, command-like utterance ("tomato price", "onion rate today") is
// safe to treat as a bare lookup even with no explicit action keyword match.
// Once it reads like an actual question — ends in "?", contains a question
// word in any supported language, or is simply longer than a short command —
// it should be routed to Level 2 (ASK_AI) instead of being hijacked into
// SHOW_MARKET_PRICES just because a crop name happened to appear in it.
const SHORT_COMMAND_MAX_WORDS = 6;

function isQuestionLike(raw, lower) {
  if (raw.trim().endsWith('?')) return true;
  if (matchesAny(lower, QUESTION_MARKERS)) return true;
  const wordCount = raw.trim().split(/\s+/).filter(Boolean).length;
  return wordCount > SHORT_COMMAND_MAX_WORDS;
}

/**
 * @param {string} transcript - raw speech-recognized text
 * @param {string} lang - current app language code ('en'|'hi'|'kn'|...)
 * @param {Object} navBundle - the CURRENT role's own translated nav.*
 *   strings, e.g. i18nInstance.getResourceBundle(lang, 'translation').nav
 * @returns {{ intent: string, params?: Object }}
 */
export function detectAction(transcript, lang, navBundle = {}) {
  const raw = (transcript || '').trim();
  const lower = raw.toLowerCase();
  if (!lower) return { intent: INTENTS.EMPTY };

  // 1. CHANGE_LANGUAGE takes priority over everything else — a sentence
  // that names a language is essentially never ALSO a market/navigation
  // command in this app.
  for (const [code, aliases] of Object.entries(LANGUAGE_NAME_ALIASES)) {
    if (matchesAny(lower, aliases)) return { intent: INTENTS.CHANGE_LANGUAGE, params: { languageCode: code } };
  }

  // 1.5 OPEN_NAMED_DASHBOARD (possessive form, e.g. "open Ravi's
  // dashboard"). Checked this early because the literal word "dashboard"
  // makes this shape specific enough not to collide with anything else.
  const possessiveName = extractPossessiveDashboardName(raw, lang);
  if (possessiveName) return { intent: INTENTS.OPEN_NAMED_DASHBOARD, params: { name: possessiveName } };

  const kw = ACTION_KEYWORDS[lang];
  const crop = extractCrop(lower, lang);

  // 2. Matching
  if (kw && matchesAny(lower, kw.smartMatching)) return { intent: INTENTS.RUN_SMART_MATCHING, params: crop ? { crop } : {} };
  if (kw && matchesAny(lower, kw.matchResults)) return { intent: INTENTS.SHOW_MATCH_RESULTS };

  // 3. Market intents (crop param carried along when detected) — more
  // specific phrasing (trend / nearest / best) is checked before the
  // generic "show prices" catch-all so e.g. "tomato price trend" is
  // SHOW_TREND, not SHOW_MARKET_PRICES.
  if (kw && matchesAny(lower, kw.trend)) return { intent: INTENTS.SHOW_TREND, params: crop ? { crop } : {} };
  if (kw && matchesAny(lower, kw.nearestMarket)) return { intent: INTENTS.SHOW_NEAREST_MARKET, params: crop ? { crop } : {} };
  if (kw && matchesAny(lower, kw.bestMarket)) return { intent: INTENTS.SHOW_BEST_MARKET, params: crop ? { crop } : {} };
  if (kw && matchesAny(lower, kw.marketPrices)) return { intent: INTENTS.SHOW_MARKET_PRICES, params: crop ? { crop } : {} };
  // Crop name detected with no explicit action keyword — only a safe bet
  // when the utterance is a short, command-like lookup ("tomato price",
  // "onion rate today"). A longer or question-shaped utterance that merely
  // mentions a crop ("why is the tomato price so low compared to last
  // week?") is a real question meant for Level 2, not a bare price lookup —
  // fall through (past profile/nav/help, none of which will match a real
  // question) to ASK_AI in step 7 instead of hijacking it here.
  if (crop && !isQuestionLike(raw, lower)) {
    return { intent: INTENTS.SHOW_MARKET_PRICES, params: { crop } };
  }

  // 4. Profile
  if (kw && matchesAny(lower, kw.myCrops)) return { intent: INTENTS.SHOW_MY_CROPS };
  if (kw && matchesAny(lower, kw.myLots)) return { intent: INTENTS.SHOW_MY_LOTS };

  // 5. Navigation — works in ALL 10 languages via each role's own
  // translated nav bundle, independent of the `kw` table above.
  for (const key of Object.keys(NAV_TARGET_TO_INTENT)) {
    const label = navBundle?.[key];
    const synonyms = lang === 'en' ? (NAV_SYNONYMS_EN[key] || []) : [];
    const candidates = [label, ...synonyms].filter(Boolean);
    if (candidates.some((c) => labelMatches(lower, c))) {
      return { intent: NAV_TARGET_TO_INTENT[key] };
    }
  }

  // 5.5 OPEN_NAMED_DASHBOARD (generic "go to <name>"). Checked only
  // after step 5's known nav targets so "go to dashboard" / "go to
  // market" resolve to their own OPEN_* intents first, not here.
  const goToName = extractGoToName(raw, lang);
  if (goToName) return { intent: INTENTS.OPEN_NAMED_DASHBOARD, params: { name: goToName } };

  // 6. General
  if (kw && matchesAny(lower, kw.help)) return { intent: INTENTS.HELP };
  if (kw && matchesAny(lower, kw.why)) return { intent: INTENTS.EXPLAIN_WHY };
  if (kw && matchesAny(lower, kw.sellHelp)) return { intent: INTENTS.OPEN_MARKET_INTELLIGENCE };
  if (kw && matchesAny(lower, kw.findBuyers)) return { intent: INTENTS.OPEN_BUYER_DEMAND };

  // 7. Level 2 — anything else goes to Gemini.
  return { intent: INTENTS.ASK_AI, params: { question: raw } };
}