import axios from 'axios';
import { RepoMetadata, IndexingProgress, ChatMessage, SourceCitation, RepoSummary, RepoFile } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

export const api = {
  analyzeRepository: async (url: string): Promise<RepoMetadata> => {
    const res = await client.post('/repositories/analyze', { url });
    return res.data;
  },

  startIndexing: async (url: string, forceReindex: boolean = false): Promise<IndexingProgress> => {
    const res = await client.post('/repositories/index', { url, force_reindex: forceReindex });
    return res.data;
  },

  getIndexingStatus: async (repositoryId: string): Promise<IndexingProgress> => {
    const res = await client.get(`/repositories/${repositoryId}/status`);
    return res.data;
  },

  getRepositoryInfo: async (repositoryId: string): Promise<RepoMetadata> => {
    const res = await client.get(`/repositories/${repositoryId}`);
    return res.data;
  },

  sendChatMessage: async (
    repositoryId: string,
    message: string,
    history: { role: string; content: string }[]
  ): Promise<{ answer: string; sources: SourceCitation[] }> => {
    const res = await client.post(`/repositories/${repositoryId}/chat`, {
      message,
      history,
    });
    return res.data;
  },

  getRepositoryFiles: async (repositoryId: string): Promise<RepoFile[]> => {
    const res = await client.get(`/repositories/${repositoryId}/files`);
    return res.data.files || [];
  },

  getRepositorySummary: async (repositoryId: string): Promise<RepoSummary> => {
    const res = await client.get(`/repositories/${repositoryId}/summary`);
    return res.data;
  },

  deleteRepository: async (repositoryId: string): Promise<void> => {
    await client.delete(`/repositories/${repositoryId}`);
  },
};
