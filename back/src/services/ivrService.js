// services/ivrService.js — Enhancement 3 (Multi-language + IVR).
// A farmer without a smartphone can still reach AgriSphere over a basic
// phone call. This service is the deterministic "brain" behind that
// call: it builds the spoken menu tree and the spoken price/offer
// readouts, using the same Market/Buyer data the web app already shows.
// English is the single source of truth for every spoken line — every
// other supported language is produced by machine-translating that text
// through the free MyMemory API (translateService.js) at request time,
// not from a hand-written per-language script. The frontend's IVRWidget
// simulates the phone call in-browser (DTMF keypad + text-to-speech)
// against these same endpoints, so the logic is identical whether it's
// a real IVR provider or the in-app simulator calling it.
import Market from '../models/Market.js';
import Buyer from '../models/Buyer.js';
import { translate } from './translateService.js';

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'kn'];
const LANGUAGE_NAMES = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ' };

function resolveLang(lang) {
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
}

// English source scripts — the only place any IVR wording is written.
const EN = {
  welcome: 'Welcome to AgriSphere AI voice helpline.',
  menu: "Press 1 to hear today's crop prices. Press 2 to hear buyer offers. Press 3 to repeat this menu in another language. Press 9 to repeat.",
  askCrop: (crops) => `Please say or key in your crop. Available crops are: ${crops.join(', ')}.`,
  noPrices: (crop) => `Sorry, no price data is available for ${crop} right now.`,
  priceReadout: (crop, rows) => {
    const lines = rows.slice(0, 3).map((m) => `${m.name}, ${Math.round(m.modalPrice)} rupees per kilogram, trending ${m.trend}`);
    return `Today's prices for ${crop}. ${lines.join('. ')}.`;
  },
  noOffers: (crop) => `Sorry, no buyers are currently seeking ${crop}.`,
  offerReadout: (crop, rows) => {
    const lines = rows.slice(0, 3).map((b) => `${b.name} is offering ${Math.round(b.offerPricePerKg)} rupees per kilogram for ${b.quantityRequiredTonnes} tonnes`);
    return `Buyer offers for ${crop}. ${lines.join('. ')}.`;
  },
  goodbye: 'Thank you for calling AgriSphere AI. Goodbye.',
};

export async function getIvrMenu(lang) {
  const l = resolveLang(lang);
  const [welcomeText, menuText] = await Promise.all([
    translate(EN.welcome, l),
    translate(EN.menu, l),
  ]);

  return {
    language: l,
    languages: SUPPORTED_LANGUAGES.map((code) => ({ code, name: LANGUAGE_NAMES[code] })),
    welcomeText,
    menuText,
    options: [
      { key: '1', label: "Today's crop prices" },
      { key: '2', label: 'Buyer offers' },
      { key: '3', label: 'Change language' },
      { key: '9', label: 'Repeat menu' },
    ],
  };
}

export async function getPriceReadout(lang, crop) {
  const l = resolveLang(lang);
  if (!crop) {
    const crops = await Market.distinct('crop');
    return { text: await translate(EN.askCrop(crops), l), crops };
  }
  const rows = await Market.find({ crop }).sort({ modalPrice: -1 }).limit(5).lean();
  if (!rows.length) return { text: await translate(EN.noPrices(crop), l) };
  return { text: await translate(EN.priceReadout(crop, rows), l), markets: rows };
}

export async function getOfferReadout(lang, crop) {
  const l = resolveLang(lang);
  if (!crop) {
    const crops = await Buyer.distinct('cropRequired');
    return { text: await translate(EN.askCrop(crops), l), crops };
  }
  const rows = await Buyer.find({ cropRequired: crop }).sort({ offerPricePerKg: -1 }).limit(5).lean();
  if (!rows.length) return { text: await translate(EN.noOffers(crop), l) };
  return { text: await translate(EN.offerReadout(crop, rows), l), buyers: rows };
}

export async function getGoodbye(lang) {
  return translate(EN.goodbye, resolveLang(lang));
}