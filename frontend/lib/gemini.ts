import { GoogleGenerativeAI } from '@google/generative-ai';

const rawKeysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSy_dummy_build_key';
const apiKeys: string[] = rawKeysString.split(',').map((k) => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

export function getGenAI(): GoogleGenerativeAI {
  const key = apiKeys[currentKeyIndex % apiKeys.length] || 'AIzaSy_dummy_build_key';
  return new GoogleGenerativeAI(key);
}

export const genAI = {
  getGenerativeModel: (options: any) => getGenAI().getGenerativeModel(options),
};

export function rotateKey(): string {
  if (apiKeys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.warn(`[Gemini Auth] Rotated to API key #${currentKeyIndex + 1} of ${apiKeys.length}`);
  }
  return apiKeys[currentKeyIndex % apiKeys.length];
}

export const GEMINI_LLM_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateGeminiContent(promptText: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
  const modelsToTry = Array.from(new Set([
    GEMINI_LLM_MODEL,
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.6-flash'
  ]));

  let lastError: Error | null = null;

  for (let keyAttempt = 0; keyAttempt < Math.max(1, apiKeys.length); keyAttempt++) {
    const ai = getGenAI();
    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = ai.getGenerativeModel({
            model: modelName,
            systemInstruction,
            generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined,
          });
          const result = await model.generateContent(promptText);
          const text = result.response.text();
          if (text) return text;
        } catch (err: any) {
          lastError = err;
          if (err.message?.includes('quota') || err.message?.includes('429')) {
            rotateKey();
            break; // rotate key and try next key
          }
          console.warn(`Model ${modelName} attempt ${attempt + 1} error (${err?.message || err}), trying next fallback...`);
          if (attempt < 1) await sleep(800);
        }
      }
    }
  }

  throw new Error(`All Gemini API keys and model fallbacks are currently experiencing high demand. Please try again in a moment.`);
}

export async function generateGeminiEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  for (let keyAttempt = 0; keyAttempt < Math.max(1, apiKeys.length); keyAttempt++) {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

    try {
      const requests = texts.map((t) => ({
        content: { role: 'user', parts: [{ text: t.slice(0, 8000) }] },
      }));

      const res = await model.batchEmbedContents({ requests });
      if (res.embeddings && res.embeddings.length > 0) {
        return res.embeddings.map((e) => e.values || new Array(768).fill(0));
      }
    } catch (err: any) {
      if (err.message?.includes('quota') || err.message?.includes('429')) {
        rotateKey();
        continue; // Try next API key in pool
      }
      console.warn('batchEmbedContents fallback:', err?.message);
    }
  }

  // Fallback to individual calls if batching fails
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const results: number[][] = [];
  for (const text of texts) {
    try {
      const res = await model.embedContent(text.slice(0, 8000));
      results.push(res.embedding?.values || new Array(768).fill(0));
    } catch (e) {
      results.push(new Array(768).fill(0));
    }
  }

  return results;
}

export async function generateSingleGeminiEmbedding(text: string): Promise<number[]> {
  for (let keyAttempt = 0; keyAttempt < Math.max(1, apiKeys.length); keyAttempt++) {
    try {
      const ai = getGenAI();
      const model = ai.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
      const res = await model.embedContent(text.slice(0, 8000));
      return res.embedding?.values || new Array(768).fill(0);
    } catch (err: any) {
      if (err.message?.includes('quota') || err.message?.includes('429')) {
        rotateKey();
      } else {
        break;
      }
    }
  }
  return new Array(768).fill(0);
}
