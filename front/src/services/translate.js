// services/translate.js — Enhancement 3 (Multi-language), real translation.
//
// Was: called MyMemory (https://api.mymemory.translated.net) directly
// from the browser, one string at a time. MyMemory's anonymous tier is
// rate-limited (~5000 words/day per IP) and — worse — LanguageContext
// was calling it sequentially once per UI string, which is both slow
// and the actual reason translations were silently incomplete (later
// strings in the loop would hit the rate limit and fall back to
// English mid-dictionary).
//
// Now: calls our own backend's POST /api/translate, which proxies to
// JigsawStack's batch translate endpoint (up to 100 strings per
// request — see backend/src/services/translateService.js) so the
// entire SOURCE_STRINGS dictionary goes out as one request instead of
// one per string. The JigsawStack API key stays server-side; the
// browser never talks to JigsawStack directly.
const BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Translates an array of English strings to targetLang in a single
 * request.
 * @param {string[]} texts
 * @param {string} targetLang
 * @returns {Promise<string[]>} translations in the same order as `texts`
 */
export async function translateTexts(texts, targetLang) {
  if (!texts?.length || targetLang === 'en') return texts;

  const res = await fetch(`${BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, targetLang }),
  });
  if (!res.ok) throw new Error(`Translation request failed (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data?.translations) || data.translations.length !== texts.length) {
    throw new Error('Translation response malformed');
  }
  return data.translations;
}

// Kept for any single-string call site — wraps translateTexts so there's
// still just one translation path (and therefore one place that talks
// to the backend) going forward.
export async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  const [translated] = await translateTexts([text], targetLang);
  return translated ?? text;
}