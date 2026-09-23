'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RepoInput } from '../components/RepoInput';
import { RepoCard } from '../components/RepoCard';
import { IndexingStatus } from '../components/IndexingStatus';
import { ChatInterface } from '../components/ChatInterface';
import { RepoSummaryModal } from '../components/RepoSummaryModal';
import { api } from '../lib/api';
import { RepoMetadata, IndexingProgress, ChatMessage, RepoSummary } from '../types';

export default function Home() {
  const [metadata, setMetadata] = useState<RepoMetadata | null>(null);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<RepoSummary | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startStatusPolling = (repositoryId: string) => {
    clearPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await api.getIndexingStatus(repositoryId);
        setProgress(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearPolling();
        }
      } catch (err: any) {
        clearPolling();
      }
    }, 2000);
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

  const handleAnalyzeAndIndex = async (url: string, forceReindex: boolean = false) => {
    setError(null);
    setIsAnalyzing(true);
    setMessages([]);
    setSummary(null);

    try {
      // 1. Analyze repository metadata
      const meta = await api.analyzeRepository(url);
      setMetadata(meta);

      // 2. Start background vector indexing
      const initialProgress = await api.startIndexing(url, forceReindex);
      setProgress(initialProgress);

      // 3. Start polling progress
      startStatusPolling(meta.repository_id);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to process GitHub repository.';
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (userQuery: string) => {
    if (!metadata) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendChatMessage(metadata.repository_id, userQuery, historyPayload);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate answer.';
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Error**: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleOpenSummary = async () => {
    if (!metadata) return;
    setIsSummaryOpen(true);
    if (!summary) {
      setIsSummaryLoading(true);
      try {
        const sum = await api.getRepositorySummary(metadata.repository_id);
        setSummary(sum);
      } catch (err: any) {
        console.error('Failed to load repository summary:', err);
      } finally {
        setIsSummaryLoading(false);
      }
    }
  };

  const handleDeleteIndex = async () => {
    if (!metadata) return;
    if (confirm(`Are you sure you want to delete the index for ${metadata.owner}/${metadata.repo}?`)) {
      try {
        await api.deleteRepository(metadata.repository_id);
        setMetadata(null);
        setProgress(null);
        setMessages([]);
        setSummary(null);
      } catch (err: any) {
        alert('Failed to delete repository index.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <RepoInput
        onAnalyze={(url) => handleAnalyzeAndIndex(url)}
        isLoading={isAnalyzing}
        error={error}
      />

      {metadata && (
        <RepoCard
          metadata={metadata}
          progress={progress}
          onReindex={() => handleAnalyzeAndIndex(metadata.repository_url, true)}
          onOpenSummary={handleOpenSummary}
          onDeleteIndex={handleDeleteIndex}
        />
      )}

      {progress && progress.status !== 'completed' && (
        <IndexingStatus progress={progress} />
      )}

      {metadata && (
        <ChatInterface
          repositoryId={metadata.repository_id}
          onSendMessage={handleSendMessage}
          messages={messages}
          isLoading={isChatLoading}
        />
      )}

      <RepoSummaryModal
        summary={summary}
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        isLoading={isSummaryLoading}
      />
    </div>
  );
}
