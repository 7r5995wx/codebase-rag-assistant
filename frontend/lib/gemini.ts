import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSy_dummy_build_key';

export const genAI = new GoogleGenerativeAI(apiKey);

export const GEMINI_LLM_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export async function generateGeminiEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const embeddings: number[][] = [];

  for (const text of texts) {
    try {
      const res = await model.embedContent(text.slice(0, 8000));
      if (res.embedding?.values) {
        embeddings.push(res.embedding.values);
      } else {
        embeddings.push(new Array(768).fill(0));
      }
    } catch (e) {
      embeddings.push(new Array(768).fill(0));
    }
  }

  return embeddings;
}

export async function generateSingleGeminiEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const res = await model.embedContent(text.slice(0, 8000));
  return res.embedding?.values || new Array(768).fill(0);
}
