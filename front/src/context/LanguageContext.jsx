// context/LanguageContext.jsx — Enhancement 3 (Multi-language).
//
// `lang` here now tracks i18next's language (the SAME language the main
// nav's LanguageSwitcher controls), instead of its own separate
// localStorage key ('agrisphere.lang', independent of i18next's
// 'agrisphere_language'). Previously the two were completely
// disconnected: picking a language from the main switcher never
// reached IVRWidget/PriceTiles/VoiceAssistWidget (they only ever
// updated via their OWN local pickers, which called this context's
// setLang and nothing else) — so those three components stayed in
// whatever language they last set themselves regardless of what the
// rest of the app was showing. setLang() below now goes through
// i18n.changeLanguage(), so calling it from either place changes the
// language everywhere.
//
// Chrome strings are translated for real via JigsawStack, proxied
// through our backend (services/translate.js) the first time a
// language is selected — as ONE batched request for the whole
// dictionary, not one request per string — then cached in localStorage
// per language so we only ever call the API once per language per
// browser. After that, switching languages is instant and works
// offline.
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation as useI18n } from 'react-i18next';
import { SOURCE_STRINGS, LANGUAGES } from '../i18n/sourceStrings.js';
import { translateTexts } from '../services/translate.js';
import { applyLocationLanguageIfUnset } from '../i18n/locationLanguage.js';

const LanguageContext = createContext(null);
const cacheKey = (lang) => `agrisphere.i18n.${lang}`;

export function LanguageProvider({ children }) {
  const { i18n } = useI18n();
  const [lang, setLangState] = useState(i18n.language || 'en');
  // Task ("voice assistance should start automatically in that regional
  // language"): starts false, flips to true once the location→state→
  // language detection attempt has SETTLED — whether it changed the
  // language, found nothing mappable, or the visitor already had a
  // saved preference so it skipped entirely. VoiceAssistWidget waits
  // for this before firing its auto-greeting, so the greeting is never
  // spoken in the wrong (default/previous) language while detection is
  // still in flight — a real risk otherwise, since geolocation's
  // permission prompt + the reverse-geocode network round trip can
  // easily take longer than a fixed short timeout.
  const [locationReady, setLocationReady] = useState(false);
  const [dict, setDict] = useState(() => {
    if (lang === 'en') return SOURCE_STRINGS;
    try {
      const cached = localStorage.getItem(cacheKey(lang));
      if (cached) return JSON.parse(cached);
    } catch { /* fall through to English while we (re)fetch */ }
    return SOURCE_STRINGS;
  });
  const [translating, setTranslating] = useState(false);

  // Runs once, on first mount of the whole app (LanguageProvider wraps
  // everything — see main.jsx) — moved here from App.jsx so
  // `locationReady` can live right next to the `lang` state it gates,
  // and so it only ever runs ONCE no matter how many routes/components
  // read this context (previously App.jsx re-running this effect would
  // have meant a second geolocation permission prompt on remount).
  useEffect(() => {
    let cancelled = false;
    applyLocationLanguageIfUnset(i18n).finally(() => {
      if (!cancelled) setLocationReady(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stay in sync no matter which picker changed the language — the main
  // nav's LanguageSwitcher (i18n.changeLanguage directly), this
  // context's own setLang below, or the region-based default on first
  // visit (i18n/locationLanguage.js).
  useEffect(() => {
    const onChanged = (code) => setLangState(code);
    i18n.on('languageChanged', onChanged);
    return () => i18n.off('languageChanged', onChanged);
  }, [i18n]);

  useEffect(() => {
    if (lang === 'en') { setDict(SOURCE_STRINGS); return; }

    const cached = localStorage.getItem(cacheKey(lang));
    if (cached) { setDict(JSON.parse(cached)); return; }

    let cancelled = false;
    setTranslating(true);
    (async () => {
      const keys = Object.keys(SOURCE_STRINGS);
      const texts = keys.map((k) => SOURCE_STRINGS[k]);
      let translated = { ...SOURCE_STRINGS }; // English fallback if the request fails
      try {
        // One batched request for the whole dictionary (JigsawStack
        // accepts up to 100 strings per call — see services/translate.js)
        // instead of one request per string.
        const results = await translateTexts(texts, lang);
        translated = Object.fromEntries(keys.map((k, i) => [k, results[i] ?? SOURCE_STRINGS[k]]));
      } catch (err) {
        // Network hiccup / backend unreachable — keep the English labels
        // rather than break the UI, but log it so a missing/rate-limited
        // JIGSAWSTACK_API_KEY is visible in devtools instead of looking
        // like the feature just silently does nothing.
        console.warn('LanguageContext: bulk translation failed, showing English:', err.message);
      }
      if (!cancelled) {
        setDict(translated);
        try { localStorage.setItem(cacheKey(lang), JSON.stringify(translated)); } catch { /* storage full/unavailable — just skip caching */ }
        setTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [lang]);

  const setLang = (code) => {
    i18n.changeLanguage(code); // triggers the 'languageChanged' listener above
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, languages: LANGUAGES, dict, translating, locationReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

export function useTranslation() {
  const { dict, lang } = useLanguage();
  const t = (key) => dict[key] || SOURCE_STRINGS[key] || key;
  return { t, lang };
}

// Module-level cache for DYNAMIC (runtime, backend-generated) strings —
// separate from the static SOURCE_STRINGS dictionary above. Static UI
// chrome (nav labels, buttons, headings) is a small, fixed key set that
// gets machine-translated once per language and cached to localStorage
// (see LanguageProvider above) — that's the "static data" that already
// translates correctly. Live/dynamic content (backend messages like
// "No live market data found for this filter.", price-trend
// predictions, activity-chart captions) is NOT part of that fixed
// dictionary — it varies by crop/market/data-state and can't be
// pre-declared as a key — so it never went through any translation path
// at all before this. useDynamicTranslation() sends whatever dynamic
// English strings are currently on screen through the same backend
// batch-translate endpoint, caches per (lang, text) for the life of the
// tab (not localStorage — dynamic text changes far more often than the
// UI chrome does), and falls back to the English original instantly
// while a translation is in flight or if it fails.
const dynamicCache = new Map(); // `${lang}::${text}` -> translated text

export function useDynamicTranslation(texts) {
  const { lang } = useLanguage();
  // Normalize to a stable array reference we can safely depend on.
  const list = Array.isArray(texts) ? texts : [texts];
  const [translated, setTranslated] = useState(list);
  const depKey = `${lang}::${list.join('\u0000')}`;

  useEffect(() => {
    if (lang === 'en' || !list.length) { setTranslated(list); return; }

    const missing = [...new Set(list.filter((t) => t && !dynamicCache.has(`${lang}::${t}`)))];
    const applyFromCache = () => list.map((t) => (t ? dynamicCache.get(`${lang}::${t}`) ?? t : t));

    if (!missing.length) { setTranslated(applyFromCache()); return; }

    let cancelled = false;
    translateTexts(missing, lang)
      .then((results) => {
        missing.forEach((t, i) => dynamicCache.set(`${lang}::${t}`, results[i] ?? t));
        if (!cancelled) setTranslated(applyFromCache());
      })
      .catch((err) => {
        console.warn('useDynamicTranslation: batch translation failed, showing English:', err.message);
        if (!cancelled) setTranslated(list);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return Array.isArray(texts) ? translated : translated[0];
}