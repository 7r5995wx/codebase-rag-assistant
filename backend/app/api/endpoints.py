import os
import shutil
import asyncio
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, status
from app.core.config import settings
from app.core.security import parse_github_url, sanitize_chat_query
from app.models.schemas import (
    RepoAnalyzeRequest, RepoMetadata, RepoIndexRequest, IndexingProgress,
    ChatRequest, ChatResponse, RepoSummaryResponse, RepoFileListResponse,
    RepoFile
)
from app.ingestion.github_client import GitHubIngestionService
from app.parsing.tree_sitter_parser import parse_code_file
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import QdrantVectorStore
from app.rag.retriever import RAGRetriever
from app.rag.llm_chain import GroundedRAGChain
from app.rag.summary_generator import RepoSummaryGenerator

router = APIRouter()

# In-memory storage for repository metadata and indexing progress
REPO_METADATA_STORE: Dict[str, RepoMetadata] = {}
INDEXING_STATUSES: Dict[str, IndexingProgress] = {}

# Services initialization
github_service = GitHubIngestionService()
embedding_service = EmbeddingService()
vector_store = QdrantVectorStore()
retriever = RAGRetriever(embedding_service, vector_store)
rag_chain = GroundedRAGChain(retriever)
summary_generator = RepoSummaryGenerator(vector_store)


async def _run_indexing_pipeline(repository_id: str, url: str, force_reindex: bool):
    """
    Background pipeline for cloning, parsing, embedding, and vectorizing repository.
    """
    progress = INDEXING_STATUSES[repository_id]
    temp_dir = f"/tmp/rag_repos/{repository_id}"

    try:
        # Phase 1: Fetch metadata
        progress.status = "fetching"
        progress.progress_percentage = 10.0
        progress.message = "Fetching repository metadata..."

        metadata = await github_service.fetch_repository_metadata(url)
        REPO_METADATA_STORE[repository_id] = metadata

        # Phase 2: Clone repository
        progress.status = "analyzing"
        progress.progress_percentage = 25.0
        progress.message = "Cloning repository..."

        await github_service.clone_repository(metadata.repository_url, temp_dir)

        # Phase 3: Scan and parse files
        progress.status = "parsing"
        progress.progress_percentage = 40.0
        progress.message = "Parsing source files with Tree-sitter AST..."

        scanned_files = github_service.scan_repository_files(temp_dir)
        all_chunks = []

        for rel_path, language, size_bytes in scanned_files:
            full_path = os.path.join(temp_dir, rel_path)
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                chunks = parse_code_file(
                    repository_id=repository_id,
                    file_path=rel_path,
                    content=content,
                    language=language,
                    commit_sha=metadata.commit_sha or ""
                )
                all_chunks.extend(chunks)
            except Exception:
                continue

            if len(all_chunks) >= settings.MAX_CHUNK_COUNT:
                all_chunks = all_chunks[:settings.MAX_CHUNK_COUNT]
                break

        progress.files_indexed = len(scanned_files)
        progress.chunks_created = len(all_chunks)

        if not all_chunks:
            progress.status = "failed"
            progress.error = "No supported code files were found to index."
            return

        # Phase 4: Generate Embeddings
        progress.status = "embedding"
        progress.progress_percentage = 65.0
        progress.message = f"Generating vector embeddings for {len(all_chunks)} chunks..."

        chunk_texts = [c.content for c in all_chunks]
        embeddings = await embedding_service.generate_embeddings_batch(chunk_texts)

        # Phase 5: Upsert to Qdrant Vector DB
        progress.status = "vectorizing"
        progress.progress_percentage = 85.0
        progress.message = "Upserting vectors into Qdrant database..."

        if force_reindex:
            vector_store.delete_repository(repository_id)

        vector_store.upsert_chunks(all_chunks, embeddings)

        # Phase 6: Finalize
        progress.status = "completed"
        progress.progress_percentage = 100.0
        progress.message = "Repository indexing complete."

    except Exception as e:
        progress.status = "failed"
        progress.error = str(e)
        progress.message = f"Indexing failed: {str(e)}"
    finally:
        # Cleanup temp cloned repository directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/repositories/analyze", response_model=RepoMetadata)
async def analyze_repository(req: RepoAnalyzeRequest):
    """Validates GitHub URL and fetches repository metadata."""
    try:
        metadata = await github_service.fetch_repository_metadata(req.url)
        REPO_METADATA_STORE[metadata.repository_id] = metadata
        return metadata
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {str(e)}")


@router.post("/repositories/index", response_model=IndexingProgress)
async def start_indexing(req: RepoIndexRequest, background_tasks: BackgroundTasks):
    """Triggers background repository ingestion & vector indexing pipeline."""
    try:
        owner, repo, repository_id = parse_github_url(req.url)
        
        # Check if already indexing
        existing = INDEXING_STATUSES.get(repository_id)
        if existing and existing.status in ["fetching", "analyzing", "parsing", "embedding", "vectorizing"]:
            return existing

        progress = IndexingProgress(
            repository_id=repository_id,
            status="queued",
            progress_percentage=0.0,
            message="Queued for indexing..."
        )
        INDEXING_STATUSES[repository_id] = progress

        background_tasks.add_task(_run_indexing_pipeline, repository_id, req.url, req.force_reindex)
        return progress
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repositories/{repository_id}/status", response_model=IndexingProgress)
async def get_indexing_status(repository_id: str):
    """Returns current indexing progress and status for a repository."""
    status_obj = INDEXING_STATUSES.get(repository_id)
    if not status_obj:
        # Check if vectors already exist in Qdrant
        files = vector_store.get_repository_files(repository_id)
        if files:
            return IndexingProgress(
                repository_id=repository_id,
                status="completed",
                progress_percentage=100.0,
                message="Repository indexing complete.",
                files_indexed=len(files),
                chunks_created=sum(f.get("chunk_count", 1) for f in files)
            )
        raise HTTPException(status_code=404, detail="Repository not found or not indexed.")
    return status_obj


@router.get("/repositories/{repository_id}", response_model=RepoMetadata)
async def get_repository_info(repository_id: str):
    """Returns stored repository metadata."""
    meta = REPO_METADATA_STORE.get(repository_id)
    if not meta:
        files = vector_store.get_repository_files(repository_id)
        if files:
            return RepoMetadata(
                owner=repository_id.split("_")[0] if "_" in repository_id else "github",
                repo=repository_id.split("_")[-1] if "_" in repository_id else repository_id,
                repository_id=repository_id,
                repository_url=f"https://github.com/{repository_id.replace('_', '/')}",
                file_count=len(files)
            )
        raise HTTPException(status_code=404, detail="Repository metadata not found.")
    return meta


@router.post("/repositories/{repository_id}/chat", response_model=ChatResponse)
async def chat_repository(repository_id: str, req: ChatRequest):
    """Queries the grounded RAG pipeline for an answer and source code citations."""
    try:
        sanitized_query = sanitize_chat_query(req.message, settings.MAX_CHAT_INPUT_CHARS)
        chat_resp = await rag_chain.answer_question(
            query=sanitized_query,
            repository_id=repository_id,
            history=req.history
        )
        return chat_resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG Chat error: {str(e)}")


@router.get("/repositories/{repository_id}/files", response_model=RepoFileListResponse)
async def list_repository_files(repository_id: str):
    """Lists all indexed files in the repository."""
    raw_files = vector_store.get_repository_files(repository_id)
    repo_files = [
        RepoFile(
            file_path=f["file_path"],
            language=f["language"],
            chunk_count=f["chunk_count"],
            start_line=f.get("start_line", 1),
            end_line=f.get("end_line", 1)
        )
        for f in raw_files
    ]
    return RepoFileListResponse(repository_id=repository_id, files=repo_files)


@router.get("/repositories/{repository_id}/summary", response_model=RepoSummaryResponse)
async def get_repository_summary(repository_id: str):
    """Generates an architectural summary of the repository."""
    meta = REPO_METADATA_STORE.get(repository_id)
    repo_name = meta.repo if meta else repository_id
    summary = await summary_generator.generate_summary(repository_id, repo_name)
    return summary


@router.delete("/repositories/{repository_id}")
async def delete_repository_index(repository_id: str):
    """Purges indexed repository vectors and status."""
    vector_store.delete_repository(repository_id)
    INDEXING_STATUSES.pop(repository_id, None)
    REPO_METADATA_STORE.pop(repository_id, None)
    return {"message": f"Repository '{repository_id}' index purged successfully."}
