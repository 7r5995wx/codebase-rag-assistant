import pytest
import asyncio
from app.core.config import settings
from app.ingestion.github_client import GitHubIngestionService
from app.parsing.tree_sitter_parser import parse_code_file
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import QdrantVectorStore
from app.rag.retriever import RAGRetriever
from app.rag.llm_chain import GroundedRAGChain
from app.rag.summary_generator import RepoSummaryGenerator


@pytest.mark.asyncio
async def test_full_rag_pipeline_e2e():
    if not settings.OPENAI_API_KEY:
        pytest.skip("OPENAI_API_KEY is not configured.")

    test_url = "https://github.com/expressjs/express"
    github_service = GitHubIngestionService()

    # 1. Fetch metadata
    meta = await github_service.fetch_repository_metadata(test_url)
    assert meta.owner == "expressjs"
    assert meta.repo == "express"
    assert meta.repository_id == "expressjs_express"

    # 2. Clone repo
    temp_dir = f"/tmp/test_rag_repo_{meta.repository_id}"
    await github_service.clone_repository(meta.repository_url, temp_dir)

    # 3. Scan & parse files
    scanned = github_service.scan_repository_files(temp_dir)
    assert len(scanned) > 0

    all_chunks = []
    for rel_path, language, size_bytes in scanned[:10]:  # Limit to 10 files for fast test
        full_p = f"{temp_dir}/{rel_path}"
        try:
            with open(full_p, "r", encoding="utf-8", errors="ignore") as f:
                code = f.read()
            chunks = parse_code_file(meta.repository_id, rel_path, code, language)
            all_chunks.extend(chunks)
        except Exception:
            continue

    assert len(all_chunks) > 0

    # 4. Generate Embeddings & Upsert to Qdrant
    embedding_service = EmbeddingService(settings.OPENAI_API_KEY)
    vector_store = QdrantVectorStore()

    texts = [c.content for c in all_chunks]
    vectors = await embedding_service.generate_embeddings_batch(texts)
    assert len(vectors) == len(all_chunks)

    vector_store.upsert_chunks(all_chunks, vectors)

    # 5. Vector Search & RAG Chat
    retriever = RAGRetriever(embedding_service, vector_store)
    chain = GroundedRAGChain(retriever, settings.OPENAI_API_KEY)

    response = await chain.answer_question(
        query="What is the main purpose of this repository?",
        repository_id=meta.repository_id
    )

    assert response.answer is not None
    assert len(response.answer) > 20
    assert len(response.sources) > 0

    # 6. Architectural Summary
    summary_gen = RepoSummaryGenerator(vector_store, settings.OPENAI_API_KEY)
    summary = await summary_gen.generate_summary(meta.repository_id, meta.repo)
    assert summary.overview is not None
    assert len(summary.overview) > 10

    # Cleanup
    vector_store.delete_repository(meta.repository_id)
