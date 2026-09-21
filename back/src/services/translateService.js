// services/translateService.js — Enhancement 3 (Multi-language + IVR).
//
// Was: free, keyless machine translation via MyMemory
// (https://mymemory.translated.net/doc/spec.php), called one string at
// a time. MyMemory's anonymous tier is rate-limited (~5000 words/day/IP)
// and translating a whole UI dictionary one request per string was both
// slow and the actual cause of translations silently failing partway
// through (a later string in the loop would start getting rate-limited
// responses back).
//
// Now: JigsawStack's translate endpoint
// (https://api.jigsawstack.com/v1/ai/translate), which accepts an ARRAY
// of up to 100 strings per request and returns them translated in the
// same order — so a whole UI string dictionary can go out as one (or a
// couple, chunked) request instead of one-per-string. English is still
// the single source of truth for every IVR line (see ivrService.js) and
// every frontend chrome string (see the frontend's services/translate.js
// + context/LanguageContext.jsx) — every other language is produced by
// translating through this API rather than from a hand-written script.
//
// Kept server-side only (never called directly from the browser) so the
// JigsawStack API key is never shipped to the client bundle. Uses axios
// with a timeout, same as the rest of this app's outbound calls
// (geoService.js, marketDataService.js).
import axios from 'axios';

const JIGSAWSTACK_URL = 'https://api.jigsawstack.com/v1/ai/translate';
const CHUNK_SIZE = 100; // JigsawStack's per-request limit
const cache = new Map(); // `${targetLang}::${text}` -> translated text, life of the process

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function callJigsawStack(texts, targetLang) {
  if (!process.env.JIGSAWSTACK_API_KEY) {
    throw new Error('JIGSAWSTACK_API_KEY is not configured');
  }
  const { data } = await axios.post(
    JIGSAWSTACK_URL,
    { text: texts, target_language: targetLang },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.JIGSAWSTACK_API_KEY,
      },
      timeout: 15000,
    },
  );
  const translated = Array.isArray(data?.translated_text) ? data.translated_text : null;
  if (!translated || translated.length !== texts.length) {
    throw new Error('JigsawStack translate: unexpected response shape');
  }
  return translated;
}

/**
 * Translates a single string. Kept for ivrService.js's existing
 * per-line call sites (spoken IVR prompts are built up one at a time as
 * the call progresses, so there's rarely more than one new string to
 * translate per call). Cached per (text, language) for the life of the
 * process, same as before.
 */
export async function translate(text, targetLang) {
  if (!text || !targetLang || targetLang === 'en') return text;

  const key = `${targetLang}::${text}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const [translated] = await callJigsawStack([text], targetLang);
    cache.set(key, translated);
    return translated;
  } catch (err) {
    console.error('translateService: JigsawStack request failed:', err.message);
    // Network hiccup / missing key / rate limit — fall back to the
    // English source rather than failing the call; a caller still hears
    // or sees something.
    return text;
  }
}

/**
 * Translates an array of strings in as few requests as possible
 * (chunked at 100 — JigsawStack's per-request limit). This is what the
 * frontend's bulk UI-dictionary translation (LanguageContext.jsx, via
 * POST /api/translate) uses instead of one request per string.
 * Per-string cache is checked/filled the same as translate() above, so
 * repeat languages across users/requests reuse cached strings.
 * @returns {Promise<string[]>} translations in the same order as `texts`
 */
export async function translateBatch(texts, targetLang) {
  if (!Array.isArray(texts) || !texts.length) return [];
  if (!targetLang || targetLang === 'en') return texts;

  const results = new Array(texts.length);
  const toFetch = []; // { index, text }
  texts.forEach((text, i) => {
    const key = `${targetLang}::${text}`;
    if (cache.has(key)) {
      results[i] = cache.get(key);
    } else {
      toFetch.push({ index: i, text });
    }
  });

  if (toFetch.length) {
    for (const batch of chunkArray(toFetch, CHUNK_SIZE)) {
      try {
        const translated = await callJigsawStack(batch.map((b) => b.text), targetLang);
        batch.forEach((b, j) => {
          results[b.index] = translated[j];
          cache.set(`${targetLang}::${b.text}`, translated[j]);
        });
      } catch (err) {
        console.error('translateService: JigsawStack batch request failed:', err.message);
        // Fall back to the English source for this chunk only — a
        // partial translation (rest of the dictionary succeeded) beats
        // failing the whole response.
        batch.forEach((b) => { results[b.index] = b.text; });
      }
    }
  }

  return results;
}