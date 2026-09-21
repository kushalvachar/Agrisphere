// ai/prompts/qualityGrading.js
export function buildQualityGradingPrompt(cropHint) {
  return `You are an AI crop quality estimator inside AgriSphere AI, a hackathon
prototype. Look at the attached crop image${cropHint ? ` (farmer says it is: ${cropHint})` : ''}
and give a rough visual quality estimate only. This is NOT a certified laboratory
grading — make that explicit.

Respond ONLY with JSON, no markdown fences:
{
  "crop": string,
  "estimatedGrade": "A" | "B" | "C",
  "confidence": number,
  "observations": string[],
  "warning": "AI-assisted estimation; not certified quality grading."
}`;
}
