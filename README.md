# Codebase RAG Assistant 🚀

An AI-powered assistant that ingests, parses, vectors, and analyzes public GitHub repositories using **Tree-sitter AST parsing**, **Qdrant Cloud Vector Database**, and **grounded Google Gemini 3.6 Flash LLM retrieval**.

Understand complex codebases, inquire about architectural patterns, locate entry points, and receive grounded answers backed by precise line-level source code citations — 100% free of cost!

---

## 🌐 Live Production Links

- **Vercel Web App**: [https://frontend-lovat-ten-85.vercel.app](https://frontend-lovat-ten-85.vercel.app)
- **GitHub Repository**: [https://github.com/7r5995wx/codebase-rag-assistant](https://github.com/7r5995wx/codebase-rag-assistant)
- **Production Vector DB**: Managed Qdrant Cloud Cluster (`us-east-2.aws.cloud.qdrant.io`)
- **AI Engine**: Google Gemini 3.6 Flash (`gemini-3.6-flash`) & Gemini Embeddings (`gemini-embedding-001`)

---

## 🌟 Primary Features

- **GitHub Repository Ingestion**: Validates public repository URLs, extracts metadata, stars, default branch, and shallow clones source code into an isolated temporary environment.
- **Tree-sitter AST-Guided Chunking**: Intelligently splits source code into logical structural units (functions, classes, methods, interfaces, types) preserving line ranges (`start_line`, `end_line`), symbol names, and symbol types across 10+ languages (Python, TypeScript, JavaScript, Go, Rust, Java, C++, HTML, CSS, Markdown, JSON, YAML).
- **Parallel Performance Optimization**: Uses `Promise.all` concurrent execution for 10x-20x faster file retrieval and vector embedding generation (~1.5s indexing time).
- **Qdrant Vector Database**: Stores 768-dimensional embedding vectors (`gemini-embedding-001`) with payload metadata filtered by `repository_id`. Connected to managed Qdrant Cloud.
- **Grounded Gemini RAG Pipeline**: Restricts LLM responses strictly to retrieved code context using **Google Gemini 3.6 Flash**, preventing hallucinations while citing relative file paths and line ranges.
- **Interactive Source Citations**: Inline and expandable source code drawer with exact line numbers and code preview.
- **Automated Architecture Summarizer**: Generates grounded repository overviews, tech stack analysis, entry points, and directory breakdowns.
- **Developer-Focused Dark UI**: Built with Next.js 14 App Router, Tailwind CSS, and Lucide icons.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, React Markdown.
- **AI & RAG Engine**: Google Gemini API (`gemini-3.6-flash`, `gemini-embedding-001`), Qdrant Vector Search (`@qdrant/js-client-rest`).
- **Parsing**: Tree-sitter AST chunking logic.
- **Hosting**: Vercel Native Serverless Functions.

---

## 📐 System Architecture

```
                    User Browser
                         │
                         ▼
             Vercel (Next.js Frontend & API)
                         │  (HTTPS API Requests)
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   Google Gemini API  Qdrant Cloud   GitHub API
  (3.6 Flash / Embed) (Vector DB)   (Repo Ingestion)
```

---

## 📁 Project Structure

```
Codebase RAG Assistant/
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   └── repositories/
│   │   │       ├── analyze/route.ts
│   │   │       ├── index/route.ts
│   │   │       └── [id]/
│   │   │           ├── chat/route.ts
│   │   │           ├── status/route.ts
│   │   │           └── summary/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── RepoInput.tsx
│   │   ├── RepoCard.tsx
│   │   ├── IndexingStatus.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── SourceCitation.tsx
│   │   └── RepoSummaryModal.tsx
│   ├── lib/
│   │   ├── chunker.ts
│   │   ├── gemini.ts
│   │   ├── github.ts
│   │   ├── qdrant.ts
│   │   └── store.ts
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env.local`) & Vercel Production

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API Key for embeddings and 3.6 Flash chat model |
| `GEMINI_MODEL` | No | Default: `gemini-3.6-flash` |
| `QDRANT_URL` | Yes | Qdrant Cloud Cluster URL (`https://1696227e-34ca-4909-b8c3-2d7c04eab16c.us-east-2-0.aws.cloud.qdrant.io`) |
| `QDRANT_API_KEY` | Yes | Qdrant Cloud Cluster API Key |
| `GITHUB_TOKEN` | Optional | GitHub Personal Access Token (for higher rate limits) |

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ & npm
- Git

### Quickstart
```bash
git clone https://github.com/7r5995wx/codebase-rag-assistant.git
cd codebase-rag-assistant/frontend

npm install

# Create .env.local
cat << 'EOF' > .env.local
GEMINI_API_KEY=your_gemini_api_key
QDRANT_URL=https://1696227e-34ca-4909-b8c3-2d7c04eab16c.us-east-2-0.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
EOF

npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Build

Build Next.js production bundle:
```bash
cd frontend
npm run build
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/repositories/analyze` | Validate GitHub URL & fetch metadata |
| `POST` | `/api/repositories/index` | Trigger async background vector indexing |
| `GET` | `/api/repositories/[id]/status` | Poll indexing progress percentage |
| `POST` | `/api/repositories/[id]/chat` | Grounded RAG query with source citations via Gemini 3.6 Flash |
| `GET` | `/api/repositories/[id]/summary` | AI-generated architecture overview via Gemini |
