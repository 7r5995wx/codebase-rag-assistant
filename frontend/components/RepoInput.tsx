import React, { useState } from 'react';
import { Search, Github, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface RepoInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
}

const SAMPLE_REPOS = [
  { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' },
  { name: 'pallets/flask', url: 'https://github.com/pallets/flask' },
  { name: 'expressjs/express', url: 'https://github.com/expressjs/express' },
];

export const RepoInput: React.FC<RepoInputProps> = ({ onAnalyze, isLoading, error }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-cyan rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
        <div className="relative bg-dark-card border border-dark-border rounded-xl p-2 sm:p-3 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 shadow-2xl">
          <div className="flex items-center w-full pl-3 space-x-3 text-dark-muted">
            <Github className="w-5 h-5 text-dark-muted" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/owner/repository)"
              className="w-full bg-transparent text-dark-text placeholder-dark-muted/60 text-sm focus:outline-none"
              disabled={isLoading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-brand-blue to-brand-purple hover:from-blue-600 hover:to-purple-600 text-white font-semibold text-sm rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Analyze Repository</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-dark-muted">
        <span>Try sample repositories:</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => {
                setUrl(sample.url);
                onAnalyze(sample.url);
              }}
              className="hover:text-brand-cyan underline transition-colors cursor-pointer"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
