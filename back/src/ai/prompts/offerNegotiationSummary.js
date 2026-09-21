// ai/prompts/offerNegotiationSummary.js — Feature 3
export function buildOfferNegotiationSummaryPrompt(data) {
  return `You are AgriSphere AI. Summarize the negotiation thread below for a farmer in plain
language — do not change any price or quantity, and do not recommend accepting or rejecting;
only explain what has happened so far and what the gap between the two sides currently is.

NEGOTIATION DATA:
${JSON.stringify(data, null, 2)}

Respond ONLY with JSON, no markdown fences:
{
  "summary": string,
  "currentGap": string
}`;
}