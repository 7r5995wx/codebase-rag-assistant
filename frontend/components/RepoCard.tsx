import React from 'react';
import { RepoMetadata, IndexingProgress } from '../types';
import { Star, GitBranch, Code, Layers, FileText, ExternalLink, RefreshCw, Trash2, FileSearch } from 'lucide-react';

interface RepoCardProps {
  metadata: RepoMetadata;
  progress?: IndexingProgress | null;
  onReindex: () => void;
  onOpenSummary: () => void;
  onDeleteIndex: () => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({
  metadata,
  progress,
  onReindex,
  onOpenSummary,
  onDeleteIndex,
}) => {
  const isIndexed = progress?.status === 'completed';

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 shadow-xl relative overflow-hidden my-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-dark-text tracking-tight flex items-center space-x-2">
              <span>{metadata.owner} / {metadata.repo}</span>
            </h2>
            <a
              href={metadata.repository_url}
              target="_blank"
              rel="noreferrer"
              className="text-dark-muted hover:text-brand-cyan transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          {metadata.description && (
            <p className="text-sm text-dark-muted mt-1 max-w-2xl line-clamp-2">{metadata.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-dark-muted">
            <span className="flex items-center space-x-1 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-md text-brand-cyan">
              <Code className="w-3.5 h-3.5 mr-1" />
              {metadata.primary_language || 'Unknown'}
            </span>
            <span className="flex items-center space-x-1 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-md text-yellow-400">
              <Star className="w-3.5 h-3.5 mr-1" />
              {metadata.stars.toLocaleString()} stars
            </span>
            <span className="flex items-center space-x-1 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-md text-dark-muted">
              <GitBranch className="w-3.5 h-3.5 mr-1" />
              {metadata.default_branch}
            </span>
            {progress?.files_indexed ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-md text-brand-green">
                <FileText className="w-3.5 h-3.5 mr-1" />
                {progress.files_indexed} files indexed
              </span>
            ) : null}
            {progress?.chunks_created ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-md text-brand-purple">
                <Layers className="w-3.5 h-3.5 mr-1" />
                {progress.chunks_created} vectors
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={onOpenSummary}
            disabled={!isIndexed}
            className="px-3.5 py-2 bg-dark-bg hover:bg-dark-hover border border-dark-border text-dark-text text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-40"
          >
            <FileSearch className="w-3.5 h-3.5 text-brand-purple" />
            <span>Architecture Overview</span>
          </button>
          <button
            onClick={onReindex}
            className="px-3 py-2 bg-dark-bg hover:bg-dark-hover border border-dark-border text-dark-muted hover:text-dark-text text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors"
            title="Re-index repository"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Re-index</span>
          </button>
          <button
            onClick={onDeleteIndex}
            className="p-2 bg-dark-bg hover:bg-red-500/10 border border-dark-border text-dark-muted hover:text-red-400 text-xs font-medium rounded-lg transition-colors"
            title="Delete repository index"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
