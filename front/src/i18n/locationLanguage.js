// i18n/locationLanguage.js — Enhancement: default language by region.
//
// On first visit (no language explicitly chosen yet — see LANG_STORAGE_KEY
// below), asks the browser for the user's location and maps the Indian
// state it resolves to onto one of SUPPORTED_LANGUAGES, so e.g. someone
// opening the app from Karnataka lands in Kannada rather than always in
// English. A returning visitor, or anyone who has ever used the language
// switcher, keeps their own choice — this never overrides an explicit
// selection.
//
// Uses the browser's Geolocation API + OpenStreetMap's Nominatim reverse-
// geocoding endpoint (free, keyless, CORS-enabled — the same public
// service this app already depends on indirectly via react-leaflet/OSRM
// on the backend). Fails silently and leaves the language as whatever
// i18next-browser-languagedetector already picked (browser locale, or
// 'en') if geolocation is denied, unsupported, or the lookup fails —
// this is a nice-to-have default, never a blocker.
import { SUPPORTED_LANGUAGES } from './index.js';

const LANG_STORAGE_KEY = 'agrisphere_language'; // matches i18n/index.js detection.lookupLocalStorage
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const GEOLOCATION_TIMEOUT_MS = 8000;

// Indian state/UT name (lowercase, as Nominatim returns it) -> language
// code. Only states with a clear majority regional language among
// SUPPORTED_LANGUAGES are mapped; everything else (including states
// where Hindi is the primary language) intentionally falls through to
// the 'hi' entries below or is left unmapped, so it keeps whatever
// browser-locale default i18next already chose instead of a bad guess.
const STATE_LANGUAGE_MAP = {
  karnataka: 'kn',
  'andhra pradesh': 'te',
  telangana: 'te',
  'tamil nadu': 'ta',
  puducherry: 'ta',
  kerala: 'ml',
  lakshadweep: 'ml',
  maharashtra: 'mr',
  goa: 'mr',
  'west bengal': 'bn',
  tripura: 'bn',
  gujarat: 'gu',
  'dadra and nagar haveli and daman and diu': 'gu',
  punjab: 'pa',
  chandigarh: 'pa',
  'uttar pradesh': 'hi',
  bihar: 'hi',
  'madhya pradesh': 'hi',
  rajasthan: 'hi',
  haryana: 'hi',
  delhi: 'hi',
  'nct of delhi': 'hi',
  chhattisgarh: 'hi',
  jharkhand: 'hi',
  uttarakhand: 'hi',
  'himachal pradesh': 'hi',
};

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEOLOCATION_TIMEOUT_MS,
      enableHighAccuracy: false, // a rough fix is plenty for state-level language detection
    });
  });
}

async function reverseGeocodeState(lat, lng) {
  const url = `${NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lng}&format=json&zoom=5&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const data = await res.json();
  return data?.address?.state?.trim().toLowerCase() || null;
}

// Title-cases a lowercase state name for logging only ("karnataka" ->
// "Karnataka"); the lookup itself stays lowercase (STATE_LANGUAGE_MAP keys).
function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Detects a default language from the browser's current location, or
 * returns null if it can't (denied/unsupported/lookup failed/state not
 * mapped). Never throws — logs why it gave up (permission denied,
 * insecure context, lookup failure, unmapped state) so a "why didn't
 * this run" question is answerable from the browser console instead of
 * looking like the feature silently does nothing.
 *
 * Graceful fallback (spec requirement): if this returns null for ANY
 * reason — permission denied, unsupported browser, network/lookup
 * failure, or a state with no regional-language mapping — the caller
 * does nothing further, which means whatever i18next-browser-
 * languagedetector already picked stands: the browser's own language
 * (navigator.language) if it's one of SUPPORTED_LANGUAGES, otherwise
 * `fallbackLng: 'en'` from i18n/index.js. That detector already runs
 * as part of i18n.init(), before this function is ever called, so
 * "location denied -> browser language -> English" falls out of the
 * existing init order rather than needing to be re-implemented here.
 */
export async function detectLanguageFromLocation() {
  if (!navigator.geolocation) {
    console.warn('[Language] Geolocation is unavailable (unsupported browser, or the page is not served over HTTPS/localhost — Geolocation requires a secure context). Falling back to browser language.');
    return null;
  }

  let position;
  try {
    position = await getCurrentPosition();
    console.log('[Language] Location permission granted');
  } catch (err) {
    console.warn('[Language] Location permission denied (or request failed) —', err.message || err, '— falling back to browser language.');
    return null;
  }

  console.log('[Language] Coordinates detected', { lat: position.coords.latitude, lng: position.coords.longitude });

  let state;
  try {
    state = await reverseGeocodeState(position.coords.latitude, position.coords.longitude);
  } catch (err) {
    console.warn('[Language] Reverse geocoding failed —', err.message || err, '— falling back to browser language.');
    return null;
  }
  if (!state) {
    console.warn('[Language] Reverse geocode returned no state for this location — falling back to browser language.');
    return null;
  }
  console.log(`[Language] State detected: ${titleCase(state)}`);

  const code = STATE_LANGUAGE_MAP[state];
  if (!code) {
    console.info(`[Language] No regional language mapped for state "${titleCase(state)}" — keeping the current default (browser language, or English).`);
    return null;
  }

  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  if (!meta) return null;
  console.log(`[Language] Language mapped: ${meta.englishName} (${meta.code})`);
  return code;
}

/**
 * Applies the location-detected language via i18n.changeLanguage, but
 * only if the visitor has never explicitly chosen one (no saved
 * preference in localStorage). Safe to call on every app load — it's a
 * no-op after the first successful run, or for a returning visitor.
 * Re-checks the saved-preference flag AFTER the (slow — geolocation
 * permission + network round trip) detection resolves too, not just
 * before starting it: otherwise a manual pick made via the language
 * switcher while detection was still in flight would get silently
 * overwritten the moment detection finally resolved.
 */
export async function applyLocationLanguageIfUnset(i18n) {
  if (localStorage.getItem(LANG_STORAGE_KEY)) {
    console.log('[Language] A manually-chosen language is already saved — skipping location-based auto-detection.');
    return;
  }
  const code = await detectLanguageFromLocation();
  if (code && !localStorage.getItem(LANG_STORAGE_KEY)) {
    await i18n.changeLanguage(code); // i18next-browser-languagedetector persists this to localStorage[agrisphere_language] automatically
    console.log('[Language] Language switched successfully');
  }
}