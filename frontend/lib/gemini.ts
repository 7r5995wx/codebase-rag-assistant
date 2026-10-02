import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSy_dummy_build_key';

export const genAI = new GoogleGenerativeAI(apiKey);

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

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined,
        });
        const result = await model.generateContent(promptText);
        const text = result.response.text();
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} attempt ${attempt + 1} encountered error (${err?.message || err}), trying next fallback...`);
        if (attempt < 1) await sleep(800);
      }
    }
  }

  throw new Error('All Gemini model fallbacks are currently experiencing high demand. Please try again in a moment.');
}

export async function generateGeminiEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const BATCH_SIZE = 15;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await Promise.all(
      batch.map(async (text) => {
        try {
          const res = await model.embedContent(text.slice(0, 8000));
          return res.embedding?.values || new Array(768).fill(0);
        } catch (e) {
          return new Array(768).fill(0);
        }
      })
    );
    results.push(...batchEmbeddings);
  }

  return results;
}

export async function generateSingleGeminiEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const res = await model.embedContent(text.slice(0, 8000));
  return res.embedding?.values || new Array(768).fill(0);
}
