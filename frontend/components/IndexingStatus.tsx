import React from 'react';
import { IndexingProgress } from '../types';
import { CheckCircle2, AlertCircle, Loader2, Database, Code2, GitPullRequest, FileCheck } from 'lucide-react';

interface IndexingStatusProps {
  progress: IndexingProgress;
}

export const IndexingStatus: React.FC<IndexingStatusProps> = ({ progress }) => {
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 my-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
          ) : isFailed ? (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-brand-cyan animate-spin flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-dark-text">
            {isCompleted
              ? 'Repository Indexing Complete'
              : isFailed
              ? 'Indexing Error'
              : progress.message}
          </span>
        </div>
        <span className="text-xs font-mono font-medium text-brand-cyan">
          {Math.round(progress.progress_percentage)}%
        </span>
      </div>

      <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden border border-dark-border">
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted
              ? 'bg-gradient-to-r from-brand-green to-emerald-400'
              : isFailed
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-brand-blue via-brand-purple to-brand-cyan'
          }`}
          style={{ width: `${progress.progress_percentage}%` }}
        ></div>
      </div>

      {progress.error && (
        <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">
          {progress.error}
        </p>
      )}
    </div>
  );
};
