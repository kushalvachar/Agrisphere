// ai/prompts/arrivalVolumeInsight.js — Feature 1
export function buildArrivalVolumeInsightPrompt(data) {
  return `You are AgriSphere AI. The backend has already deterministically computed arrival-volume
statistics below (recent vs prior average arrivals, % change, and a rule-based price-pressure
label). Do NOT recompute or contradict these numbers — only explain what they mean for a farmer
deciding when to sell, in 2-4 simple sentences.

ARRIVAL VOLUME DATA (already calculated by the backend):
${JSON.stringify(data, null, 2)}

Respond ONLY with JSON, no markdown fences:
{
  "insight": string,
  "sellTimingHint": string
}`;
}