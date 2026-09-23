import React from 'react';
import { RepoSummary } from '../types';
import { X, Layers, Code, Folder, FileCode, Cpu } from 'lucide-react';

interface RepoSummaryModalProps {
  summary: RepoSummary | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

export const RepoSummaryModal: React.FC<RepoSummaryModalProps> = ({
  summary,
  isOpen,
  onClose,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-brand-purple" />
            <h3 className="font-bold text-dark-text text-base">
              Architecture Overview - {summary?.repo_name || 'Repository'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-dark-muted hover:text-dark-text rounded-lg hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-dark-text">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
              <p className="text-dark-muted">Analyzing indexed codebase architecture...</p>
            </div>
          ) : summary ? (
            <>
              <div>
                <h4 className="font-semibold text-brand-cyan mb-1 flex items-center space-x-1.5 text-xs">
                  <Layers className="w-4 h-4" />
                  <span>Project Overview</span>
                </h4>
                <p className="text-dark-muted leading-relaxed bg-dark-bg p-3 rounded-lg border border-dark-border/60">
                  {summary.overview}
                </p>
              </div>

              {summary.tech_stack && summary.tech_stack.length > 0 && (
                <div>
                  <h4 className="font-semibold text-brand-blue mb-2 flex items-center space-x-1.5 text-xs">
                    <Code className="w-4 h-4" />
                    <span>Technologies & Frameworks</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.tech_stack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-md font-mono font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.key_directories && summary.key_directories.length > 0 && (
                <div>
                  <h4 className="font-semibold text-brand-green mb-2 flex items-center space-x-1.5 text-xs">
                    <Folder className="w-4 h-4" />
                    <span>Key Directories</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {summary.key_directories.map((dir, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-dark-bg border border-dark-border rounded-lg text-dark-muted font-mono"
                      >
                        📁 {dir}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.entry_points && summary.entry_points.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-400 mb-2 flex items-center space-x-1.5 text-xs">
                    <FileCode className="w-4 h-4" />
                    <span>Main Entry Points</span>
                  </h4>
                  <div className="space-y-1">
                    {summary.entry_points.map((ep, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-dark-bg border border-dark-border rounded-lg font-mono text-dark-text"
                      >
                        📄 {ep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-brand-purple mb-1 text-xs">Architecture Summary</h4>
                <p className="text-dark-muted leading-relaxed bg-dark-bg p-3 rounded-lg border border-dark-border/60">
                  {summary.architecture}
                </p>
              </div>
            </>
          ) : (
            <p className="text-dark-muted text-center py-6">No summary available.</p>
          )}
        </div>
      </div>
    </div>
  );
};
