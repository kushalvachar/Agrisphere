// services/profitCalculator.js
//
// THE core differentiator of AgriSphere AI (spec section 5).
// Deterministic, backend-only arithmetic — Gemini never touches these
// numbers, it only explains them in plain language afterwards.
//
//   Net Realisation = Selling Price - Transport Cost - Storage Cost - Transaction Cost

const TRANSACTION_COST_PCT = 0.01; // flat 1% platform/handling cost, kept simple on purpose

/**
 * @param {Object} params
 * @param {number} params.sellingPricePerKg
 * @param {number} params.transportCostPerKg
 * @param {number} [params.storageCostPerKgPerDay]
 * @param {number} [params.storageDays]
 * @returns {{ rawPrice:number, transportCost:number, storageCost:number, transactionCost:number, netRealization:number }}
 */
export function calculateNetRealization({
  sellingPricePerKg,
  transportCostPerKg = 0,
  storageCostPerKgPerDay = 0,
  storageDays = 0,
}) {
  const rawPrice = round2(sellingPricePerKg);
  const transportCost = round2(transportCostPerKg);
  const storageCost = round2(storageCostPerKgPerDay * storageDays);
  const transactionCost = round2(sellingPricePerKg * TRANSACTION_COST_PCT);

  const netRealization = round2(rawPrice - transportCost - storageCost - transactionCost);

  return { rawPrice, transportCost, storageCost, transactionCost, netRealization };
}

/**
 * Ranks a list of {label, sellingPricePerKg, transportCostPerKg, ...} options
 * by net realization (highest first) — used to pick "best market" or
 * "best buyer", not simply the highest raw price (spec section 4B).
 */
export function rankByNetRealization(options) {
  return options
    .map((opt) => ({ ...opt, breakdown: calculateNetRealization(opt) }))
    .sort((a, b) => b.breakdown.netRealization - a.breakdown.netRealization);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
