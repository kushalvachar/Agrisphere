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
import { useLanguage } from './LanguageContext.jsx';
import { useTranslation } from 'react-i18next';
import i18nInstance, { getLanguageMeta } from '../i18n/index.js';
import { api } from '../api/client.js';

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

// Best-effort keyword sets for ACTION intents (best market / why / help
// / sell-help / find-buyers) in the 5 languages the spec names
// explicitly (Kannada, Tamil, Telugu, Hindi, English). Plain PAGE
// NAVIGATION ("dashboard", "market", "buyers"…) is handled separately
// below against the app's own already-reviewed per-language `nav.*`
// bundle (see NAV below) rather than a second hand-written list here,
// so navigation works correctly in all 10 supported languages, not
// just these 5.
//
// Honest limitation: a farmer speaking one of the other 5 supported
// languages (Marathi, Malayalam, Bengali, Gujarati, Punjabi) won't
// trigger these specific action shortcuts — the utterance instead
// falls through to `askGeneral` below, which sends it to the
// Gemini-backed /api/ai/ask endpoint. Gemini both understands the
// question and replies in the farmer's language regardless (the
// endpoint already takes a `language` parameter), so the farmer still
// gets a correct, localized, spoken answer — it just isn't guaranteed
// to trigger an in-app navigation or the exact best-market flow the way
// the 5 keyword-covered languages do.
const ACTION_KEYWORDS = {
  en: {
    bestMarket: ['best market', 'best price', 'where should i sell', 'which market', 'find best market', 'find the best market'],
    why: ['why', 'explain'],
    help: ['what can i do', 'what can you do', 'what is this app', 'what is this'],
    sellHelp: ['help me sell', 'how do i sell', 'sell my crop'],
    findBuyers: ['find buyers', 'find a buyer', 'show buyers', 'connect with buyers'],
  },
  hi: {
    bestMarket: ['सबसे अच्छा बाजार', 'सबसे अच्छा भाव', 'कहां बेचूं', 'कहाँ बेचूं', 'बेहतर बाजार'],
    why: ['क्यों'],
    help: ['क्या कर सकते', 'यह क्या है', 'मदद करो'],
    sellHelp: ['फसल कैसे बेचें', 'बेचने में मदद'],
    findBuyers: ['खरीदार खोजो', 'खरीदार ढूंढो'],
  },
  kn: {
    bestMarket: ['ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ', 'ಎಲ್ಲಿ ಮಾರಾಟ', 'ಉತ್ತಮ ಬೆಲೆ'],
    why: ['ಏಕೆ'],
    help: ['ಏನು ಮಾಡಬಹುದು', 'ಸಹಾಯ ಮಾಡಿ'],
    sellHelp: ['ಬೆಳೆ ಮಾರಾಟ ಮಾಡುವುದು ಹೇಗೆ'],
    findBuyers: ['ಖರೀದಿದಾರರನ್ನು ಹುಡುಕಿ'],
  },
  ta: {
    bestMarket: ['சிறந்த சந்தை', 'எங்கே விற்பது', 'சிறந்த விலை'],
    why: ['ஏன்'],
    help: ['என்ன செய்ய முடியும்', 'உதவி'],
    sellHelp: ['பயிரை விற்பது எப்படி'],
    findBuyers: ['வாங்குபவர்களை தேடு'],
  },
  te: {
    bestMarket: ['ఉత్తమ మార్కెట్', 'ఎక్కడ అమ్మాలి', 'ఉత్తమ ధర'],
    why: ['ఎందుకు'],
    help: ['ఏమి చేయగలరు', 'సహాయం'],
    sellHelp: ['పంట ఎలా అమ్మాలి'],
    findBuyers: ['కొనుగోలుదారులను కనుగొనండి'],
  },
};

// A few English-only synonyms layered on top of the vetted nav.*
// bundle so a phrase like the spec's own example ("Show my crop
// prices") resolves to the market page even though "crop prices" is
// not the literal nav label text ("Market Intelligence").
const NAV_SYNONYMS_EN = { market: ['crop price', 'prices', 'mandi'], dashboard: ['home'] };

function detectIntent(transcript, lang, navBundle) {
  const lower = transcript.trim().toLowerCase();
  if (!lower) return { type: 'empty' };

  const actions = ACTION_KEYWORDS[lang];
  if (actions) {
    if (actions.bestMarket.some((k) => lower.includes(k.toLowerCase()))) return { type: 'bestMarket' };
    if (actions.why.some((k) => lower.includes(k.toLowerCase()))) return { type: 'why' };
    if (actions.sellHelp.some((k) => lower.includes(k.toLowerCase()))) return { type: 'sellHelp' };
    if (actions.findBuyers.some((k) => lower.includes(k.toLowerCase()))) return { type: 'navigate', target: 'buyers' };
    if (actions.help.some((k) => lower.includes(k.toLowerCase()))) return { type: 'help' };
  }

  for (const key of ['dashboard', 'market', 'buyers', 'offers', 'transactions']) {
    const label = navBundle?.[key];
    const synonyms = lang === 'en' ? (NAV_SYNONYMS_EN[key] || []) : [];
    const candidates = [label, ...synonyms].filter(Boolean);
    if (candidates.some((c) => lower.includes(String(c).toLowerCase()))) {
      return { type: 'navigate', target: key };
    }
  }

  return { type: 'question', text: transcript };
}

export function VoiceAssistantProvider({ children }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { t } = useTranslation(); // TASK 1 fix: react-i18next, same source as the rest of the app
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
  const farmerRef = useRef(null); // { farmerId, crop, quantityTonnes, grade, storageAvailable } | null

  const speechLocale = getLanguageMeta(lang).speechLocale;
  const languageEnglishName = getLanguageMeta(lang).englishName;

  // Called by whichever layout/page mounts the widget, so intent
  // detection knows which nav item + farmer profile applies here —
  // mirrors the navItems prop AIAssistantWidget already takes, just
  // registered into the shared context instead of passed as a prop.
  const setNavContext = useCallback((basePath, navItems) => {
    navConfigRef.current = { basePath: basePath || '', navItems: navItems || [] };
  }, []);
  const setFarmerContext = useCallback((farmerCtx) => { farmerRef.current = farmerCtx || null; }, []);

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
    return [1, 2, 3, 4, 5].map((n) => t(`widget.voiceWelcome${n}`)).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, t]);

  // Conversational Assistance fallback — ANY question that isn't one of
  // the hand-covered action intents above goes here, in every one of
  // the 10 supported languages (Gemini itself is what understands the
  // language, not a keyword list). Grounded in whatever page context is
  // currently available via window.__agrisphereContext, same mechanism
  // AIAssistantWidget already uses.
  const askGeneral = useCallback(async (question) => {
    setStatus('processing');
    try {
      const context = window.__agrisphereContext || {};
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
    if (!farmer?.crop || !farmer?.quantityTonnes) {
      speak(t('widget.voiceNoFarmerProfile'));
      return;
    }
    setStatus('processing');
    try {
      const res = await api.getRecommendation({
        crop: farmer.crop,
        quantityTonnes: farmer.quantityTonnes,
        grade: farmer.grade,
        storageAvailable: farmer.storageAvailable,
        farmerId: farmer.farmerId,
        language: languageEnglishName,
      });
      if (!res.bestOption) {
        speak(res.message || t('widget.voiceNoRecommendationYet'));
        return;
      }
      memoryRef.current.lastRecommendation = res; // remembered for a follow-up "Why?"
      const reasons = (res.aiRecommendation?.reasoning || []).slice(0, 3).join('. ');
      speak(reasons ? `${res.bestOption.label}. ${reasons}` : `${res.bestOption.label}.`);
    } catch (err) {
      speak(`Sorry — ${err.message}`);
    }
  }, [languageEnglishName, speak, t]);

  // Session memory in action: "Why?" re-explains the LAST
  // recommendation this session, without re-running the whole engine.
  const explainWhy = useCallback(() => {
    const rec = memoryRef.current.lastRecommendation;
    if (!rec?.bestOption) { speak(t('widget.voiceNoRecommendationYet')); return; }
    const reasons = (rec.aiRecommendation?.reasoning || []).join('. ');
    speak(reasons || rec.disclaimer || t('widget.voiceNoRecommendationYet'));
  }, [speak, t]);

  // Navigation Assistance — resolves a target key ('dashboard'|
  // 'market'|'buyers'|'offers'|'transactions') against whatever
  // navItems the current layout registered via setNavContext.
  const goTo = useCallback((targetKey) => {
    const { basePath, navItems } = navConfigRef.current;
    const item = navItems.find((n) => (n.labelKey || '').split('.').pop() === targetKey);
    if (item) {
      navigate(item.to);
      speak(item.label || t(item.labelKey) || targetKey);
    } else if (basePath) {
      navigate(`${basePath}/${targetKey}`); // best-effort guess if this exact page isn't in the registered nav list
    }
  }, [navigate, speak, t]);

  const handleUtterance = useCallback((transcript) => {
    addLog('user', transcript);
    const navBundle = (i18nInstance.getResourceBundle(lang, 'translation') || {}).nav || {};
    const intent = detectIntent(transcript, lang, navBundle);
    memoryRef.current.lastIntent = intent.type;
    switch (intent.type) {
      case 'navigate': goTo(intent.target); break;
      case 'bestMarket': findBestMarket(); break;
      case 'why': explainWhy(); break;
      case 'help': speak(welcomeMessage); break;
      // "Help me sell" -> best current proxy is the Market Intelligence
      // page, where the actual sell-decision flow (recommendation,
      // nearby markets, buyers) lives.
      case 'sellHelp': goTo('market'); break;
      case 'question': askGeneral(transcript); break;
      default: break;
    }
  }, [lang, goTo, findBestMarket, explainWhy, welcomeMessage, speak, askGeneral, addLog]);

  // Speech Recognition: Web Speech API (free, browser-native). Not
  // continuously-listening (spec: "Not continuously listen forever") —
  // this starts on an explicit mic tap and stops itself after one
  // utterance (interimResults: false + the recognizer's own onend).
  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { speak(t('widget.voiceNotSupported')); return; }
    if (status === 'speaking') stop(); // don't listen over ourselves mid-sentence
    const rec = new SpeechRec();
    rec.lang = speechLocale;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setStatus('listening');
    rec.onresult = (e) => handleUtterance(e.results[0][0].transcript.trim());
    rec.onerror = (e) => { setStatus('idle'); if (e.error === 'no-speech') speak(t('widget.voiceNoSpeech')); };
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
    setNavContext, setFarmerContext,
    speak, stop, toggleMute, startListening, stopListening,
    clearLog: () => setLog([]),
  }), [status, muted, log, supported, lang, speechLocale, welcomeMessage, setNavContext, setFarmerContext, speak, stop, toggleMute, startListening, stopListening]);

  return <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>;
}