from typing import List, Dict, Any
from app.rag.embeddings import EmbeddingService
from app.rag.vector_store import QdrantVectorStore


class RAGRetriever:
    def __init__(self, embedding_service: EmbeddingService, vector_store: QdrantVectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def retrieve_context(self, query: str, repository_id: str, top_k: int = 8) -> List[Dict[str, Any]]:
        """
        Retrieves top-K grounded code/documentation context snippets for a query.
        """
        if not query or not query.strip():
            return []

        # 1. Embed user query
        query_vector = await self.embedding_service.generate_embedding(query)

        # 2. Perform Qdrant vector search filtered by repository_id
        hits = self.vector_store.search_similar(
            query_vector=query_vector,
            repository_id=repository_id,
            limit=top_k
        )

        return hits
