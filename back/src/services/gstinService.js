// services/gstinService.js — Phase 5: Buyer KYC.
//
// GSTIN (Goods & Services Tax Identification Number) validation.
//
// HONEST SCOPE NOTE: full "is this GSTIN actually registered and active"
// verification requires a call to the GST Network's authenticated GSP
// (GST Suvidha Provider) API, which needs a paid/registered API
// integration — not something that can be wired up with a free public
// endpoint. What CAN be done for free, and IS implemented here, is the
// same structural + checksum validation the government's own systems
// use to reject a malformed GSTIN before it's ever looked up: 15
// characters, correct state-code/PAN/entity-code layout, and the real
// modulo-36 check-digit algorithm. This catches typos and fabricated
// numbers reliably; it does NOT confirm the business is real. Buyer
// accounts are therefore created with verificationStatus 'pending'
// even after passing this check — see FPO.js's comment on the same
// pattern for the manual-review extension point.
const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function charValue(ch) {
  return GSTIN_CHARSET.indexOf(ch);
}

/**
 * @param {string} gstin
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') return { valid: false, reason: 'GSTIN is required' };
  const value = gstin.trim().toUpperCase();

  if (value.length !== 15) return { valid: false, reason: 'GSTIN must be exactly 15 characters' };
  if (!GSTIN_REGEX.test(value)) return { valid: false, reason: 'GSTIN format is invalid (expected: 2-digit state code, 10-char PAN, entity code, "Z", check digit)' };

  // Real check-digit algorithm (modulo-36), same one GSTN itself uses.
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const factor = i % 2 === 0 ? 1 : 2;
    const v = charValue(value[i]);
    if (v < 0) return { valid: false, reason: `Invalid character "${value[i]}" in GSTIN` };
    const product = v * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkDigitIndex = (36 - (sum % 36)) % 36;
  const expectedCheckChar = GSTIN_CHARSET[checkDigitIndex];

  if (value[14] !== expectedCheckChar) {
    return { valid: false, reason: 'GSTIN check digit does not match — likely a typo' };
  }

  return { valid: true, stateCode: value.slice(0, 2), pan: value.slice(2, 12) };
}
