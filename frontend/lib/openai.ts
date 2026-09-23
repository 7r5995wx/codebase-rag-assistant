import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || 'sk-dummy-build-key';

export const openaiClient = new OpenAI({
  apiKey: apiKey,
});

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
export const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
