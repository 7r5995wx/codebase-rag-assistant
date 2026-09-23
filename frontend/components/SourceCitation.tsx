import React, { useState } from 'react';
import { SourceCitation as CitationType } from '../types';
import { FileCode, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface SourceCitationProps {
  citations: CitationType[];
}

export const SourceCitationView: React.FC<SourceCitationProps> = ({ citations }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  const handleCopy = (snippet: string, index: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="mt-4 pt-3 border-t border-dark-border/60">
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-dark-muted mb-2">
        <FileCode className="w-3.5 h-3.5 text-brand-cyan" />
        <span>Retrieved Code Sources ({citations.length}):</span>
      </div>

      <div className="space-y-2">
        {citations.map((cit, idx) => {
          const isExpanded = expandedIndex === idx;
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={`${cit.file_path}-${cit.start_line}-${idx}`}
              className="bg-dark-bg/90 border border-dark-border rounded-lg overflow-hidden text-xs transition-colors"
            >
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-dark-hover/50 select-none"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono font-medium text-brand-cyan hover:underline truncate">
                    {cit.file_path}
                  </span>
                  <span className="text-dark-muted font-mono bg-dark-card px-1.5 py-0.5 rounded border border-dark-border flex-shrink-0">
                    L{cit.start_line}-{cit.end_line}
                  </span>
                  {cit.symbol_name && (
                    <span className="text-brand-purple font-mono bg-brand-purple/10 px-1.5 py-0.5 rounded border border-brand-purple/20 truncate hidden sm:inline">
                      {cit.symbol_type || 'symbol'}: {cit.symbol_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-dark-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-dark-muted" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 bg-dark-bg border-t border-dark-border relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(cit.snippet, idx);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-dark-card border border-dark-border rounded hover:text-white text-dark-muted transition-colors"
                    title="Copy snippet"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <pre className="font-mono text-xs text-dark-text overflow-x-auto p-2 bg-dark-card rounded border border-dark-border/40 max-h-60 leading-relaxed">
                    <code>{cit.snippet}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
