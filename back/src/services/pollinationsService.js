// services/pollinationsService.js
//
// The ONLY file that talks to Pollinations. Centralizes:
//   - the official openai client (pointed at the Pollinations endpoint)
//   - structured-JSON parsing (with a safety strip for stray ``` fences)
//   - a clean-throw path when the API key is missing or the call fails,
//     mirroring services/geminiService.js's getClient()/parseJSON conventions.
import OpenAI from 'openai';

const MODEL = 'openai/gpt-5.4-nano';

let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://gen.pollinations.ai/v1',
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

/** Calls Pollinations with a text-only prompt and parses the JSON response. */
export async function callPollinationsJSON(prompt) {
  const ai = getClient();
  if (!ai) throw new Error('OPENAI_API_KEY not configured');

  const response = await ai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices?.[0]?.message?.content ?? '';
  return parseJSON(text);
}

/** Calls Pollinations Vision with an image (base64) + text prompt. */
export async function callPollinationsVisionJSON(prompt, imageBase64, mimeType = 'image/jpeg') {
  const ai = getClient();
  if (!ai) throw new Error('OPENAI_API_KEY not configured');

  let response;
  try {
    response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });
  } catch (err) {
    // Wrapped so a model/provider error (e.g. vision unsupported) throws
    // cleanly and gets caught by the caller's fallback, same as every
    // other Gemini call in geminiService.js.
    throw new Error(`Pollinations vision call failed: ${err.message}`);
  }

  const text = response.choices?.[0]?.message?.content ?? '';
  return parseJSON(text);
}

function parseJSON(text) {
  const cleaned = (text ?? '').replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}