// context/VoiceAssistantContext.jsx — Feature: Intelligent Multilingual
// Voice Assistant.
//
// One shared "engine" — speech recognition, speech synthesis, language
// sync, intent detection, navigation actions, session memory — that any
// voice-driven UI in the app can consume via useVoiceAssistant().
// Currently consumed by components/VoiceAssistWidget.jsx (the floating
// bottom-left assistant), kept as a separate context rather than baked
// into that one component so a future surface (e.g. a voice control
// bar on a specific page) could reuse the exact same engine.
//
// Mounted once in main.jsx, nested:
//   BrowserRouter > AuthProvider > LanguageProvider > VoiceAssistantProvider > App
// — inside BrowserRouter so useNavigate() works, and inside
// LanguageProvider so it always reflects whatever language is currently
// active (manually chosen, or auto-detected by i18n/locationLanguage.js)
// without any extra wiring.
//
// Speech technology: browser-native only (Web Speech API — free, no
// server round trip to transcribe, no paid API), matching the
// spec's "prefer browser-native free solutions" requirement. Not every
// browser implements SpeechRecognition (Firefox notably doesn't, as of
// this writing) — `supported` below reflects that so the UI can degrade
// gracefully instead of showing a mic button that silently does nothing.
import { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useTranslation as useDictTranslation } from './LanguageContext.jsx';
import i18nInstance, { getLanguageMeta } from '../i18n/index.js';
import { api } from '../api/client.js';
import { detectAction, INTENTS } from '../voice/actionEngine.js';

const VoiceAssistantContext = createContext(null);

export function useVoiceAssistant() {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  return ctx;
}

// Kannada welcome given verbatim in the spec, used exactly as written.
// Every OTHER language's welcome is produced by the SAME
// machine-translation pipeline the rest of this app's static chrome
// already uses (see LanguageContext.jsx -> services/translate.js),
// from the voiceWelcome1..5 English lines in i18n/sourceStrings.js —
// never a second hand-authored script per language that could drift
// out of sync with the real, reviewed dictionary.
const KANNADA_WELCOME = 'ನಮಸ್ಕಾರ. AgriSphere ಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಬೆಳೆಗಳಿಗೆ ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ ಹುಡುಕಲು, ಬೆಲೆ ಮಾಹಿತಿ ಪಡೆಯಲು, ಖರೀದಿದಾರರನ್ನು ಸಂಪರ್ಕಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?';

// Feature: Multilingual Voice Agent — CHANGE_LANGUAGE confirmation,
// spoken in the LANGUAGE BEING SWITCHED TO (not the previous one), so
// the farmer gets immediate audible proof the switch worked. Hardcoded
// per-language rather than run through the dictionary/translate
// pipeline, same reasoning as KANNADA_WELCOME above: this fires the
// instant i18n.changeLanguage() resolves, before the dictionary's own
// `dict`/`t()` for the NEW language has necessarily finished loading —
// see LanguageContext.jsx's translate-on-demand caching.
const LANGUAGE_SWITCH_CONFIRMATION = {
  en: 'Language switched to English.',
  hi: 'भाषा हिन्दी में बदल दी गई है।',
  kn: 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
  ta: 'மொழி தமிழுக்கு மாற்றப்பட்டது.',
  te: 'భాష తెలుగుకు మార్చబడింది.',
  ml: 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.',
  mr: 'भाषा मराठीत बदलली आहे.',
  bn: 'ভাষা বাংলায় পরিবর্তন করা হয়েছে।',
  gu: 'ભાષા ગુજરાતીમાં બદલાઈ ગઈ છે.',
  pa: 'ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ.',
};

export function VoiceAssistantProvider({ children }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { t } = useDictTranslation();
  const [status, setStatus] = useState('idle'); // idle | listening | processing | speaking
  const [muted, setMuted] = useState(false);
  const [log, setLog] = useState([]); // { from: 'user'|'assistant', text }

  // Session memory (spec: "Assistant Memory" — a farmer asking "Why?"
  // right after "Show best market" should get an answer grounded in
  // THAT recommendation). Refs, not state — this is read inside event
  // handlers (speech recognition callbacks) and doesn't need to trigger
  // a re-render on its own.
  const memoryRef = useRef({ lastRecommendation: null, lastIntent: null });
  const recognizerRef = useRef(null);
  const navConfigRef = useRef({ basePath: '', navItems: [] });
  const farmerRef = useRef(null); // { farmerId, name, crop, quantityTonnes, grade, storageAvailable } | null

  // Feature: Page-Aware Voice Assistance. Which "screen" the voice
  // assistant should currently tailor its suggestions/welcome to —
  // 'landing' | 'dashboard' | 'market' | 'buyers'. A ref (read inside
  // non-reactive helpers below, same pattern as farmerRef/navConfigRef)
  // PLUS a tiny bit of state so that anything exposed via context value
  // (contextualWelcomeMessage/suggestions) actually re-renders when the
  // page changes — a ref alone wouldn't trigger that.
  const pageContextRef = useRef('landing');
  const [pageContext, setPageContextState] = useState('landing');
  // Bumped whenever setFarmerContext runs, for the same reason: farmerRef
  // is a ref (handleUtterance/executeIntent read it directly, no need to
  // re-render for that), but suggestions/contextualWelcomeMessage below
  // DO need to recompute once the farmer's crop becomes known.
  const [farmerVersion, setFarmerVersion] = useState(0);

  const speechLocale = getLanguageMeta(lang).speechLocale;
  const languageEnglishName = getLanguageMeta(lang).englishName;

  // Called by whichever layout/page mounts the widget, so intent
  // detection knows which nav item + farmer profile applies here —
  // mirrors the navItems prop AIAssistantWidget already takes, just
  // registered into the shared context instead of passed as a prop.
  const setNavContext = useCallback((basePath, navItems) => {
    navConfigRef.current = { basePath: basePath || '', navItems: navItems || [] };
  }, []);
  const setFarmerContext = useCallback((farmerCtx) => {
    farmerRef.current = farmerCtx || null;
    setFarmerVersion((v) => v + 1);
  }, []);

  // Feature: Page-Aware Voice Assistance. Called by whichever page mounts
  // (Landing, FarmerDashboard, MarketIntelligence, BuyerDiscovery) so the
  // assistant's suggestion chips + welcome message match what's actually
  // useful on THAT screen, exactly like setNavContext/setFarmerContext
  // above already do for navigation/farmer data.
  const setPageContext = useCallback((page) => {
    pageContextRef.current = page || 'landing';
    setPageContextState(page || 'landing');
  }, []);

  const addLog = useCallback((from, text) => setLog((l) => [...l.slice(-19), { from, text }]), []);

  // Speech Output: SpeechSynthesis API (free, browser-native).
  const speak = useCallback((text, onEnd) => {
    if (!text) { onEnd?.(); return; }
    addLog('assistant', text);
    if (muted || !('speechSynthesis' in window)) { setStatus('idle'); onEnd?.(); return; }
    window.speechSynthesis.cancel(); // never talk over itself
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLocale; // Feature: voice auto-switches with the site language
    utter.rate = 0.95;
    utter.onstart = () => setStatus('speaking');
    utter.onend = () => { setStatus('idle'); onEnd?.(); };
    utter.onerror = () => { setStatus('idle'); onEnd?.(); };
    window.speechSynthesis.speak(utter);
  }, [muted, speechLocale, addLog]);

  // Distinct "Stop speaking" control (spec: separate from Mute) — stops
  // whatever is currently being said/listened to right now, without
  // toggling the standing mute preference.
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try { recognizerRef.current?.stop(); } catch { /* already stopped */ }
    setStatus('idle');
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) stop(); // muting mid-sentence stops it immediately, doesn't just silence future speech
      return !m;
    });
  }, [stop]);

  const welcomeMessage = useMemo(() => {
    if (lang === 'kn') return KANNADA_WELCOME;
    return [1, 2, 3, 4, 5].map((n) => t(`voiceWelcome${n}`)).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, t]);

  // Feature: Page-Aware Voice Assistance — per-page suggestion chips.
  // Pure lookup against pageContextRef/farmerRef (no navigation, no
  // speaking), exposed both as a callable helper AND as the memoized
  // `suggestions` value below, same "helper + exposed value" shape the
  // rest of this file already uses (resolveNavPath vs. goTo, etc.).
  const getContextualSuggestions = useCallback(() => {
    const crop = farmerRef.current?.crop;
    switch (pageContextRef.current) {
      case 'dashboard':
        return [
          `Today's ${crop || 'crop'} price`,
          'Find buyers for my crop',
          'Run smart matching',
          'Show transport options',
        ];
      case 'market':
        return [
          'Best market nearby',
          'Price trend',
          'Compare markets',
          'Highest paying market',
        ];
      case 'buyers':
        return [
          'Run smart matching',
          'Find buyers for my crop',
        ];
      case 'landing':
      default:
        return [
          "Show today's mandi prices",
          'Find nearby markets',
          'Help me login',
          'Register as farmer',
        ];
    }
  }, []);

  // Feature: Page-Aware Voice Assistance — contextual welcome message.
  // Falls back to the existing multilingual `welcomeMessage` (Kannada
  // hardcode + translate-pipeline languages) for any page/state that
  // doesn't have a specific scripted greeting of its own (Market
  // Intelligence, Buyer Discovery, or a Dashboard visit before the
  // farmer's crop is known yet) — so multilingual support is unaffected
  // outside the two screens this feature explicitly scripts.
  const getContextualWelcomeMessage = useCallback(() => {
    const page = pageContextRef.current;
    const farmer = farmerRef.current;

    if (page === 'dashboard' && farmer?.crop) {
      const firstName = (farmer.name || '').trim().split(/\s+/)[0] || '';
      const suggestionLine = getContextualSuggestions().join(', ');
      return `Namaste${firstName ? ' ' + firstName : ''}. I see your current crop is ${farmer.crop}. You can ask me: ${suggestionLine}. How can I help you?`;
    }

    if (page === 'landing') {
      const suggestionLine = getContextualSuggestions().join(', ');
      return `Namaste. Welcome to AgriSphere. You can ask me: ${suggestionLine}. How can I help you today?`;
    }

    return welcomeMessage;
  }, [welcomeMessage, getContextualSuggestions]);

  // Exposed reactive values — recompute only when the page or the
  // farmer profile actually changes (see pageContext/farmerVersion
  // state above), not on every render.
  const suggestions = useMemo(
    () => getContextualSuggestions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageContext, farmerVersion, getContextualSuggestions],
  );
  const contextualWelcomeMessage = useMemo(
    () => getContextualWelcomeMessage(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageContext, farmerVersion, getContextualWelcomeMessage],
  );

  // Conversational Assistance fallback — ANY question that isn't one of
  // the hand-covered action intents above goes here, in every one of
  // the 10 supported languages (Gemini itself is what understands the
  // language, not a keyword list). Grounded in whatever page context is
  // currently available via window.__agrisphereContext (same mechanism
  // AIAssistantWidget already uses), PLUS this session's own farmer
  // profile (crop/quantity/grade) as `farmerProfile` — sent separately
  // from window.__agrisphereContext because that object is only
  // populated once the farmer has actually visited a page that sets it
  // (Dashboard, Market Intelligence…), whereas farmerRef here is set
  // the moment ANY farmer-role page mounts (see setFarmerContext /
  // useVoiceNavRegistration). The backend uses it to narrow the live
  // market snapshot it always attaches to every question (Task: "AI
  // should be knowing the market details") to the farmer's own crop —
  // see controllers/aiController.js — so a general "what's my best
  // market" -type question gets a relevant answer even from a page
  // that never itself loaded market data.
  const askGeneral = useCallback(async (question) => {
    setStatus('processing');
    try {
      const context = { ...(window.__agrisphereContext || {}), farmerProfile: farmerRef.current || undefined };
      const res = await api.askAssistant({ question, context, language: languageEnglishName });
      memoryRef.current.lastAnswer = res.answer;
      speak(res.answer);
    } catch (err) {
      speak(`Sorry — ${err.message}`);
    }
  }, [languageEnglishName, speak, t]);

  // Market Intelligence Assistance ("I want best market for my crop") —
  // reuses the SAME /api/recommendation engine the Farmer Dashboard's
  // AI recommendation card already calls (price + distance + trend +
  // net realization, ranked), now also passing `language` so
  // aiRecommendation.reasoning comes back already localized (see
  // ai/prompts/saleRecommendation.js).
  const findBestMarket = useCallback(async () => {
  const farmer = farmerRef.current;

  console.log("Trying farmer dashboard action");

if (typeof window.__runBestSellingOption === "function") {
  await window.__runBestSellingOption();
} else {
  console.log("Best selling option function not found");
}

  if (!farmer?.crop) {
    speak(t('voiceNoFarmerProfile'));
    return;
  }

  speak(
    t('voiceRunningBestMarketAnalysis') ||
    'Running best selling option simulation now.'
  );
}, [speak, t]);

  // Session memory in action: "Why?" re-explains the LAST
  // recommendation this session, without re-running the whole engine.
  const explainWhy = useCallback(() => {
    const rec = memoryRef.current.lastRecommendation;
    if (!rec?.bestOption) { speak(t('voiceNoRecommendationYet')); return; }
    const reasons = (rec.aiRecommendation?.reasoning || []).join('. ');
    speak(reasons || rec.disclaimer || t('voiceNoRecommendationYet'));
  }, [speak, t]);

  // Navigation Assistance — resolves a target key ('dashboard'|
  // 'market'|'buyers'|'offers'|'transactions'|'lot'|'analytics'|
  // 'assistant') against whatever navItems the current layout
  // registered via setNavContext, WITHOUT navigating or speaking
  // (pure lookup) — shared by goTo() below and by runSmartMatching(),
  // which needs the raw path to append its own `?autoMatch=1` query
  // param rather than goTo's default "speak the page label" behavior.
  const resolveNavPath = useCallback((targetKey) => {
    const { basePath, navItems } = navConfigRef.current;
    const item = navItems.find((n) => (n.labelKey || '').split('.').pop() === targetKey);
    if (item) return { path: item.to, label: item.label || t(item.labelKey) };
    if (basePath) return { path: `${basePath}/${targetKey}`, label: null }; // best-effort guess if this exact page isn't in the registered nav list
    return { path: null, label: null };
  }, [t]);

  // Feature: Multilingual Voice AGENT — every OPEN_*/SHOW_MARKET_PRICES/
  // SHOW_TREND/SHOW_NEAREST_MARKET navigation intent goes through this
  // one function. `crop`, when given (SHOW_MARKET_PRICES/SHOW_TREND/
  // SHOW_NEAREST_MARKET carry it as a param), is appended as a
  // `?crop=` query param — pages/MarketIntelligence.jsx reads it to
  // preselect that crop instead of always opening on its own default —
  // and is also read out so the farmer hears which crop was opened.
  const goTo = useCallback((targetKey, { crop } = {}) => {
    const { path, label } = resolveNavPath(targetKey);
    if (!path) { speak(t('voiceNavUnavailable')); return; }
    navigate(crop ? `${path}?crop=${encodeURIComponent(crop)}` : path);
    const spoken = label || targetKey;
    speak(crop ? `${spoken} — ${crop}` : spoken);
  }, [navigate, resolveNavPath, speak, t]);

  // Feature: Multilingual Voice AGENT — RUN_SMART_MATCHING. Follows the
  // spec's own numbered flow: identify the current farmer (or, for an
  // FPO with no individual farmer profile registered, their most
  // recently formed Smart Lot instead — same crop/quantity/grade shape),
  // call the EXISTING deterministic Smart Matching API
  // (POST /api/buyers/match — services/matchingService.js, already used
  // by the "Run Smart Matching" button on pages/BuyerDiscovery.jsx),
  // navigate to that same results page, and read the count + top match
  // aloud. Reuses that one existing endpoint rather than adding a new
  // one, and only ever makes the ONE extra `listLots` call when it's
  // actually needed (FPO with no farmer profile) — see "minimize
  // unnecessary API calls".
  const runSmartMatching = useCallback(async () => {
    setStatus('processing');
    try {
      const farmer = farmerRef.current;
      const isFpo = navConfigRef.current.basePath.startsWith('/fpo');
      let crop, quantityTonnes, grade;

      if (farmer?.crop && farmer?.quantityTonnes) {
        ({ crop, quantityTonnes, grade } = farmer);
      } else if (isFpo) {
        const lotsRes = await api.listLots({});
        const lot = (lotsRes.lots || [])[0];
        if (!lot) { speak(t('voiceNoLotsYet')); return; }
        crop = lot.crop; quantityTonnes = lot.totalQuantityTonnes; grade = lot.grade;
      } else {
        speak(t('voiceNoFarmerProfile'));
        return;
      }

      const res = await api.matchBuyers({ crop, quantityTonnes, grade });
      const matches = res.matches || [];
      const { path } = resolveNavPath('buyers');
      if (path) navigate(`${path}?autoMatch=1`); // BuyerDiscovery.jsx re-runs the SAME match call itself on this flag, so the visual page matches what's spoken

      if (!matches.length) { speak(res.message || t('voiceNoMatchesFound')); return; }
      const top = matches[0];
      speak([
        t('voiceSmartMatchingFoundPrefix'), matches.length, t('voiceSmartMatchingFoundSuffix'),
        t('voiceSmartMatchingTopBuyerPrefix'), top.buyer.name + ',', top.matchPercent, t('voiceSmartMatchingPercentSuffix'),
      ].join(' '));
    } catch (err) {
      speak(`Sorry — ${err.message}`);
    } finally {
      setStatus((s) => (s === 'processing' ? 'idle' : s));
    }
  }, [navigate, resolveNavPath, speak, t]);

  // Feature: Multilingual Voice AGENT — OPEN_NAMED_DASHBOARD ("open
  // Ramesh's dashboard", "go to Ramesh"). Farmer list is cached in a
  // ref with a short TTL so repeated navigation commands in one
  // session (e.g. "open Ramesh", then "open Suresh" a few seconds
  // later) don't refetch the full farmer list every single time —
  // same "minimize unnecessary API calls" reasoning as
  // runSmartMatching's lot lookup above.
  const FARMER_LIST_TTL_MS = 60 * 1000;
  const farmerListCacheRef = useRef({ data: null, fetchedAt: 0 });

  const getFarmerList = useCallback(async () => {
    const cache = farmerListCacheRef.current;
    const now = Date.now();
    if (cache.data && now - cache.fetchedAt < FARMER_LIST_TTL_MS) return cache.data;
    const res = await api.listFarmers();
    const list = res.farmers || res.data || (Array.isArray(res) ? res : []) || [];
    farmerListCacheRef.current = { data: list, fetchedAt: now };
    return list;
  }, []);

  // Case-insensitive best match against a spoken name: exact match
  // first, then substring (either direction, so "Ramesh" matches
  // "Ramesh Kumar" and vice versa), then a loose token-overlap fuzzy
  // match as a last resort (handles minor mis-hearings/mis-transcriptions).
  const matchFarmerByName = useCallback((farmers, name) => {
    const target = (name || '').trim().toLowerCase();
    if (!target || !farmers?.length) return null;

    const exact = farmers.find((f) => (f.name || '').trim().toLowerCase() === target);
    if (exact) return exact;

    const substring = farmers.find((f) => {
      const n = (f.name || '').trim().toLowerCase();
      return n && (n.includes(target) || target.includes(n));
    });
    if (substring) return substring;

    const targetTokens = target.split(/\s+/).filter(Boolean);
    let best = null;
    let bestScore = 0;
    for (const f of farmers) {
      const nameTokens = (f.name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      const score = targetTokens.filter((tok) => nameTokens.some((nt) => nt.startsWith(tok) || tok.startsWith(nt))).length;
      if (score > bestScore) { bestScore = score; best = f; }
    }
    return bestScore > 0 ? best : null;
  }, []);

  const openNamedDashboard = useCallback(async (name) => {
    setStatus('processing');
    try {
      const farmers = await getFarmerList();
      const match = matchFarmerByName(farmers, name);
      if (!match) {
        speak(`${t('voiceFarmerNotFound') || "I couldn't find a farmer named"} ${name || ''}`.trim());
        return;
      }
      navigate('/farmer/' + match._id);
      speak(`Opening ${match.name}'s dashboard`);
    } catch (err) {
      speak(`Sorry — ${err.message}`);
    } finally {
      setStatus((s) => (s === 'processing' ? 'idle' : s));
    }
  }, [getFarmerList, matchFarmerByName, navigate, speak, t]);

  // Feature: Multilingual Voice AGENT — SHOW_MY_CROPS / SHOW_MY_LOTS
  // ("Profile" commands). Answered DIRECTLY from the already-registered
  // farmerRef with NO navigation and NO API call at all (the fastest,
  // cheapest possible response — see "minimize unnecessary API calls")
  // when a farmer profile is available. On the FPO role (which has no
  // individual "my crop", only pooled Lots) SHOW_MY_LOTS instead
  // navigates to the real Create/View Smart Lots page, exactly like a
  // plain "open lots" navigation command would.
  const showMyCropInfo = useCallback(() => {
    const farmer = farmerRef.current;
    if (!farmer?.crop) { speak(t('voiceNoFarmerProfile')); return; }
    speak([
      t('voiceMyCropPrefix'), farmer.crop + ',', farmer.quantityTonnes, t('voiceMyCropQuantitySuffix'),
      farmer.grade, t('voiceMyCropGradeSuffix'),
    ].join(' '));
  }, [speak, t]);

  const showMyLots = useCallback(() => {
    const isFpo = navConfigRef.current.basePath.startsWith('/fpo');
    if (isFpo) { goTo('lot'); return; }
    showMyCropInfo(); // farmers don't have individual "Lots" in this app's data model — their own crop IS the closest equivalent
  }, [goTo, showMyCropInfo]);

  // Feature: Multilingual Voice AGENT — CHANGE_LANGUAGE. Reuses the
  // EXACT SAME i18next instance every other language switch already
  // goes through (LanguageSwitcher.jsx, i18n/locationLanguage.js), so
  // this is a real, permanent, app-wide language change — not a
  // voice-only quirk — and every other translated string (nav labels,
  // dashboards, future voice commands) switches with it immediately.
  const changeLanguageAction = useCallback(async (languageCode) => {
    if (!languageCode || !LANGUAGE_SWITCH_CONFIRMATION[languageCode]) return;
    await i18nInstance.changeLanguage(languageCode);
    speak(LANGUAGE_SWITCH_CONFIRMATION[languageCode]);
  }, [speak]);

  // The Voice Action Engine's execution layer: voice/actionEngine.js's
  // detectAction() does pure, structured intent detection (no hooks, no
  // navigation, unit-testable on its own); this switch is the ONLY
  // place that turns a structured `{ intent, params }` into an actual
  // frontend action / API call, per intent name.
  // Execution layer, factored out of handleUtterance so BOTH the local
  // detectAction() result AND the remote /api/ai/interpret result (see
  // interpretViaAI below) can be routed through the exact same switch —
  // "same intent vocabulary as actionEngine.js's INTENTS", dispatched
  // identically regardless of which detector produced it.
  const executeIntent = useCallback(async (intent, params, transcript) => {
    switch (intent) {
      case INTENTS.OPEN_DASHBOARD: goTo('dashboard'); break;
      case INTENTS.OPEN_MARKET_INTELLIGENCE: goTo('market', params); break;
      case INTENTS.OPEN_BUYER_DEMAND: goTo('buyers'); break;
      case INTENTS.OPEN_OFFERS: goTo('offers'); break;
      case INTENTS.OPEN_TRANSACTIONS: goTo('transactions'); break;
      case INTENTS.OPEN_ANALYTICS: goTo('analytics'); break;
      case INTENTS.OPEN_AI_CHAT: goTo('assistant'); break;
      // No Profile/Settings page exists in this prototype yet, and "FPO
      // Section" isn't a thing inside the Farmer/Buyer apps (FPO is its
      // own separate role, not a section within another role) — said
      // plainly rather than silently doing nothing or navigating
      // somewhere wrong.
      case INTENTS.OPEN_PROFILE:
      case INTENTS.OPEN_SETTINGS: speak(t('voiceFeatureNotAvailable')); break;
      case INTENTS.OPEN_FPO_SECTION:
        if (navConfigRef.current.basePath.startsWith('/fpo')) goTo('dashboard');
        else speak(t('voiceFeatureNotAvailable'));
        break;
      case INTENTS.OPEN_NAMED_DASHBOARD: openNamedDashboard(params?.name); break;
      case INTENTS.SHOW_MARKET_PRICES: goTo('market', params); break;
      case INTENTS.SHOW_TREND: goTo('market', params); break;
      case INTENTS.SHOW_NEAREST_MARKET: goTo('market', params); break;
      case INTENTS.SHOW_BEST_MARKET: await findBestMarket(); break;
      case INTENTS.RUN_SMART_MATCHING: runSmartMatching(); break;
      case INTENTS.SHOW_MATCH_RESULTS: goTo('buyers'); break;
      case INTENTS.CHANGE_LANGUAGE: changeLanguageAction(params?.languageCode); break;
      case INTENTS.SHOW_MY_CROPS: showMyCropInfo(); break;
      case INTENTS.SHOW_MY_LOTS: showMyLots(); break;
      case INTENTS.HELP: speak(welcomeMessage); break;
      case INTENTS.EXPLAIN_WHY: explainWhy(); break;
      case INTENTS.ASK_AI: askGeneral(params?.question || transcript); break;
      case INTENTS.EMPTY: default: break;
    }
  }, [
    goTo, findBestMarket, runSmartMatching, changeLanguageAction, showMyCropInfo, showMyLots,
    explainWhy, welcomeMessage, speak, askGeneral, openNamedDashboard, t,
  ]);

  // A short, imperative-sounding transcript ("open Ramesh", "go to
  // market") is far more likely to be a mis-transcribed/other-language
  // NAVIGATION command than a genuine conversational question, so only
  // THESE get sent to the (paid, slower) /api/ai/interpret endpoint —
  // anything longer or clearly phrased as a question goes straight to
  // askGeneral() as before, same as it always has.
  const looksCommandShaped = useCallback((transcript) => {
    const trimmed = (transcript || '').trim();
    if (!trimmed || trimmed.endsWith('?')) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 6) return false;
    const questionStarters = ['what', 'why', 'how', 'is', 'are', 'can', 'could', 'should', 'when', 'where', 'who', 'which', 'do', 'does', 'did', 'will', 'would'];
    const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !questionStarters.includes(firstWord);
  }, []);

  // Feature: "browser acts as agent" fallback. actionEngine.js's local,
  // free, instant keyword detection ALWAYS runs first (see
  // handleUtterance); this only fires when that returns ASK_AI/EMPTY
  // for something that still looks command-shaped — i.e. the farmer
  // almost certainly said a command, just in a phrasing/language the
  // local keyword table doesn't cover. Reuses the SAME cached farmer
  // list as openNamedDashboard so "open dashboard" / "go to Ramesh"
  // style utterances don't trigger a second farmer-list fetch.
  const interpretViaAI = useCallback(async (transcript) => {
    setStatus('processing');
    try {
      const navTargets = (navConfigRef.current.navItems || [])
        .map((n) => (n.labelKey || '').split('.').pop())
        .filter(Boolean);
      let farmerNames = [];
      try {
        const farmers = await getFarmerList();
        farmerNames = farmers.map((f) => f.name).filter(Boolean);
      } catch { /* non-fatal — interpret endpoint still works without farmerNames */ }

      const res = await api.interpretVoiceCommand({
        transcript, language: languageEnglishName, navTargets, farmerNames,
      });
      const intent = res?.intent;
      if (!intent || intent === INTENTS.EMPTY) {
        askGeneral(transcript); // AI couldn't find a command either — treat it as a genuine question
        return;
      }
      memoryRef.current.lastIntent = intent;
      executeIntent(intent, res?.params, transcript);
    } catch (err) {
      askGeneral(transcript); // interpret endpoint unavailable/failed — fall back to the conversational assistant
    } finally {
      setStatus((s) => (s === 'processing' ? 'idle' : s));
    }
  }, [languageEnglishName, getFarmerList, askGeneral, executeIntent]);

  const handleUtterance = useCallback((transcript) => {
    addLog('user', transcript);
    const navBundle = (i18nInstance.getResourceBundle(lang, 'translation') || {}).nav || {};
    const { intent, params } = detectAction(transcript, lang, navBundle);
    memoryRef.current.lastIntent = intent;

    if ((intent === INTENTS.ASK_AI || intent === INTENTS.EMPTY) && looksCommandShaped(transcript)) {
      interpretViaAI(transcript);
      return;
    }
    executeIntent(intent, params, transcript);
  }, [lang, looksCommandShaped, interpretViaAI, executeIntent, addLog]);

  // Speech Recognition: Web Speech API (free, browser-native). Not
  // continuously-listening (spec: "Not continuously listen forever") —
  // this starts on an explicit mic tap and stops itself after one
  // utterance (interimResults: false + the recognizer's own onend).
  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { speak(t('voiceNotSupported')); return; }
    if (status === 'speaking') stop(); // don't listen over ourselves mid-sentence
    const rec = new SpeechRec();
    rec.lang = speechLocale;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setStatus('listening');
    rec.onresult = (e) => handleUtterance(e.results[0][0].transcript.trim());
    rec.onerror = (e) => { setStatus('idle'); if (e.error === 'no-speech') speak(t('voiceNoSpeech')); };
    rec.onend = () => setStatus((s) => (s === 'listening' ? 'idle' : s));
    recognizerRef.current = rec;
    rec.start();
  }, [speechLocale, handleUtterance, speak, stop, status, t]);

  const stopListening = useCallback(() => {
    try { recognizerRef.current?.stop(); } catch { /* already stopped */ }
    setStatus('idle');
  }, []);

  const supported = typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const value = useMemo(() => ({
    status, muted, log, supported, lang, speechLocale, welcomeMessage,
    // Feature: Page-Aware Voice Assistance
    setPageContext, contextualWelcomeMessage, suggestions,
    setNavContext, setFarmerContext,
    speak, stop, toggleMute, startListening, stopListening,
    // Lets a UI element (e.g. a suggestion chip) run a command exactly
    // as if it had been spoken, through the SAME intent-detection path
    // handleUtterance already runs for a real mic transcript.
    processCommand: handleUtterance,
    clearLog: () => setLog([]),
  }), [
    status, muted, log, supported, lang, speechLocale, welcomeMessage,
    setPageContext, contextualWelcomeMessage, suggestions,
    setNavContext, setFarmerContext, speak, stop, toggleMute, startListening, stopListening,
    handleUtterance,
  ]);

  return <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>;
}