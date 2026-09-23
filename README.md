# Codebase RAG Assistant 🚀

An AI-powered assistant that ingests, parses, vectors, and analyzes public GitHub repositories using **Tree-sitter AST parsing**, **Qdrant Cloud Vector Database**, and **grounded OpenAI LLM retrieval**.

Understand complex codebases, inquire about architectural patterns, locate entry points, and receive grounded answers backed by precise line-level source code citations.

---

## 🌐 Live Production Links

- **Vercel Web App**: [https://frontend-lovat-ten-85.vercel.app](https://frontend-lovat-ten-85.vercel.app)
- **GitHub Repository**: [https://github.com/7r5995wx/codebase-rag-assistant](https://github.com/7r5995wx/codebase-rag-assistant)
- **Production Vector DB**: Managed Qdrant Cloud Cluster (`us-east-2.aws.cloud.qdrant.io`)

---

## 🌟 Primary Features

- **GitHub Repository Ingestion**: Validates public repository URLs, extracts metadata, stars, default branch, and shallow clones source code into an isolated temporary environment.
- **Tree-sitter AST-Guided Chunking**: Intelligently splits source code into logical structural units (functions, classes, methods, interfaces, types) preserving line ranges (`start_line`, `end_line`), symbol names, and symbol types across 10+ languages (Python, TypeScript, JavaScript, Go, Rust, Java, C++, HTML, CSS, Markdown, JSON, YAML).
- **Cost-Optimized Deterministic Hashing**: Uses SHA256 hashing to generate unique chunk IDs for deduplication and API cost control.
- **Qdrant Vector Database**: Stores embedding vectors (`text-embedding-3-small`) with payload metadata filtered by `repository_id`. Connected to managed Qdrant Cloud.
- **Grounded RAG Pipeline**: Restricts LLM responses strictly to retrieved code context, preventing hallucinations while citing relative file paths and line ranges.
- **Interactive Source Citations**: Inline and expandable source code drawer with exact line numbers and code preview.
- **Automated Architecture Summarizer**: Generates grounded repository overviews, tech stack analysis, entry points, and directory breakdowns.
- **Developer-Focused UI**: Built with Next.js 14 App Router, Tailwind CSS, and a dark theme.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, React Markdown.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Uvicorn, AsyncIO, Pytest.
- **AI & RAG**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`), Qdrant Vector Search (`qdrant-client`).
- **Parsing**: Tree-sitter (`tree-sitter`, `tree-sitter-python`, `tree-sitter-typescript`, `tree-sitter-javascript`, `tree-sitter-go`, `tree-sitter-rust`, `tree-sitter-java`, `tree-sitter-cpp`).

---

## 📐 System Architecture

```
                    User Browser
                         │
                         ▼
             Vercel (Next.js Frontend)
                         │  (HTTPS API Requests)
                         ▼
             FastAPI Production Server
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   OpenAI API     Qdrant Cloud      GitHub API / Git
(Embeddings/LLM) (Vector Storage)   (Repo Ingestion)
```

---

## 📁 Project Structure

```
Codebase RAG Assistant/
├── frontend/
│   ├── app/
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
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints.py
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   ├── ingestion/
│   │   │   ├── github_client.py
│   │   │   └── file_filter.py
│   │   ├── parsing/
│   │   │   ├── tree_sitter_parser.py
│   │   │   └── text_chunker.py
│   │   ├── rag/
│   │   │   ├── embeddings.py
│   │   │   ├── vector_store.py
│   │   │   ├── retriever.py
│   │   │   ├── llm_chain.py
│   │   │   └── summary_generator.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API Key for embeddings and chat model |
| `EMBEDDING_MODEL` | No | Default: `text-embedding-3-small` |
| `LLM_MODEL` | No | Default: `gpt-4o-mini` |
| `QDRANT_URL` | Yes | Qdrant Cloud Cluster URL (`https://1696227e-34ca-4909-b8c3-2d7c04eab16c.us-east-2-0.aws.cloud.qdrant.io`) |
| `QDRANT_API_KEY` | Yes | Qdrant Cloud Cluster API Key |
| `GITHUB_TOKEN` | Optional | GitHub Personal Access Token (for higher rate limits) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Production FastAPI Backend URL |

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Git

### 1. Set Up Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY & QDRANT_URL

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```
FastAPI Swagger docs will be available at `http://localhost:8000/docs`.

### 2. Set Up Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Testing

Run Python backend test suite:
```bash
cd backend
.venv/bin/pytest tests
```

Build Next.js frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/api/repositories/analyze` | Validate GitHub URL & fetch metadata |
| `POST` | `/api/repositories/index` | Trigger async background vector indexing |
| `GET` | `/api/repositories/{id}/status` | Poll indexing progress percentage |
| `POST` | `/api/repositories/{id}/chat` | Grounded RAG query with source citations |
| `GET` | `/api/repositories/{id}/summary` | AI-generated architecture overview |
| `GET` | `/api/repositories/{id}/files` | List indexed repository files |
| `DELETE` | `/api/repositories/{id}` | Purge vectors for repository |
