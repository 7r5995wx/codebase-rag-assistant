import React from 'react';
import './globals.css';
import { Header } from '../components/Header';

export const metadata = {
  title: 'Codebase RAG Assistant - AI Repository Intelligence',
  description: 'Understand and query any public GitHub repository using Tree-sitter AST parsing, Qdrant vector search, and grounded OpenAI LLM.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-dark-text min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-dark-border py-4 text-center text-xs text-dark-muted">
          Codebase RAG Assistant &copy; {new Date().getFullYear()} &bull; Tree-sitter AST &bull; Qdrant &bull; OpenAI RAG
        </footer>
      </body>
    </html>
  );
}
