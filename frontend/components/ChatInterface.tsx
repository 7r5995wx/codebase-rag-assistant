import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SourceCitation } from '../types';
import { Send, Bot, User, Sparkles, Loader2, MessageSquare, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SourceCitationView } from './SourceCitation';

interface ChatInterfaceProps {
  repositoryId: string;
  onSendMessage: (message: string) => Promise<void>;
  messages: ChatMessage[];
  isLoading: boolean;
}

const PRESET_QUESTIONS = [
  "How does authentication work in this repository?",
  "Where is the main entry point defined?",
  "Explain the data flow and project architecture.",
  "Which files handle API routes or core services?"
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  repositoryId,
  onSendMessage,
  messages,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handlePresetClick = (q: string) => {
    if (!isLoading) {
      onSendMessage(q);
    }
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl flex flex-col h-[650px] overflow-hidden my-4">
      {/* Chat Header */}
      <div className="px-5 py-3.5 border-b border-dark-border bg-dark-bg/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-brand-cyan" />
          <h3 className="font-semibold text-sm text-dark-text">Repository RAG Assistant</h3>
        </div>
        <span className="text-xs text-dark-muted font-mono bg-dark-card border border-dark-border px-2.5 py-1 rounded">
          Target: {repositoryId}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-cyan">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-dark-text font-semibold text-base">Ask anything about this repository</h4>
              <p className="text-xs text-dark-muted mt-1 max-w-md">
                Query code architecture, implementation details, dependencies, or function signatures.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
              {PRESET_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(q)}
                  disabled={isLoading}
                  className="p-2.5 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-left text-xs text-dark-text hover:text-brand-cyan transition-all flex items-center space-x-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-purple flex-shrink-0" />
                  <span className="line-clamp-2">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-4 text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg'
                    : 'bg-dark-bg border border-dark-border text-dark-text shadow-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitationView citations={msg.sources} />
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start space-x-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-xs text-dark-muted flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
              <span>Searching Qdrant vectors & generating grounded answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-dark-border bg-dark-bg/80">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this repository..."
            className="flex-1 bg-dark-card border border-dark-border text-dark-text placeholder-dark-muted text-xs rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-gradient-to-r from-brand-blue to-brand-purple hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
