import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSy_dummy_build_key';

export const genAI = new GoogleGenerativeAI(apiKey);

export const GEMINI_LLM_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export async function generateGeminiContent(promptText: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
  const modelsToTry = Array.from(new Set([GEMINI_LLM_MODEL, 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash']));

  for (const modelName of modelsToTry) {
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
      console.warn(`Model ${modelName} encountered error (${err.message}), trying next fallback...`);
    }
  }

  throw new Error('All Gemini model fallbacks are currently experiencing high demand. Please try again in a moment.');
}

export async function generateGeminiEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

  const embeddings = await Promise.all(
    texts.map(async (text) => {
      try {
        const res = await model.embedContent(text.slice(0, 8000));
        return res.embedding?.values || new Array(768).fill(0);
      } catch (e) {
        return new Array(768).fill(0);
      }
    })
  );

  return embeddings;
}

export async function generateSingleGeminiEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const res = await model.embedContent(text.slice(0, 8000));
  return res.embedding?.values || new Array(768).fill(0);
}
