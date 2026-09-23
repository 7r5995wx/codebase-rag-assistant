import React from 'react';
import { Terminal, Cpu, GitBranch, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue via-brand-purple to-brand-cyan p-[1px] flex items-center justify-center shadow-lg shadow-brand-blue/20">
            <div className="w-full h-full bg-dark-card rounded-[11px] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-brand-cyan" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-dark-text tracking-tight">Codebase RAG Assistant</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                <Sparkles className="w-3 h-3 mr-1" /> AI Engine v2.0
              </span>
            </div>
            <p className="text-xs text-dark-muted hidden sm:block">Understand & query any public GitHub repository with grounded AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-dark-muted bg-dark-card border border-dark-border px-3 py-1.5 rounded-lg">
            <Cpu className="w-3.5 h-3.5 text-brand-green" />
            <span>Qdrant + OpenAI</span>
          </div>
        </div>
      </div>
    </header>
  );
};
