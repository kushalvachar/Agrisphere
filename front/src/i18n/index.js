// i18n/index.js — Phase 1: Multi-language support.
//
// Uses i18next + react-i18next (free, open-source, MIT-licensed) rather
// than a paid translation widget. All strings are bundled at build time
// (no per-request translation API calls, no cost, no network latency —
// "translation should happen in seconds" is satisfied by not needing a
// network round-trip at all for the static UI).
//
// Supported languages match the SIH requirement list. Each has its own
// JSON resource file under ./locales — dropping in a more complete
// translation file later requires no code change here.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import te from './locales/te.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';
import ml from './locales/ml.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';

// Language metadata used by the LanguageSwitcher and by the voice
// assistant (BCP-47 codes for SpeechRecognition / SpeechSynthesis, and
// a human-readable English name sent to Gemini so it knows what
// language to answer in).
export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', speechLocale: 'en-IN' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', speechLocale: 'hi-IN' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', speechLocale: 'kn-IN' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', speechLocale: 'te-IN' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', speechLocale: 'ta-IN' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', speechLocale: 'mr-IN' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', speechLocale: 'ml-IN' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', speechLocale: 'bn-IN' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', speechLocale: 'gu-IN' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', speechLocale: 'pa-IN' },
];

export function getLanguageMeta(code) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

i18n
  .use(LanguageDetector) // reads ?lng=, localStorage, then navigator.language
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
      te: { translation: te },
      ta: { translation: ta },
      mr: { translation: mr },
      ml: { translation: ml },
      bn: { translation: bn },
      gu: { translation: gu },
      pa: { translation: pa },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // "Nearest regional language selected" — e.g. a browser reporting
    // "hi-IN" or "kn" should both resolve to our "hi"/"kn" bundle.
    load: 'languageOnly',
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'agrisphere_language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
