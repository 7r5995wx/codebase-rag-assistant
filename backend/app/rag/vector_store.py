import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
from app.models.schemas import ChunkMetadata


class QdrantVectorStore:
    def __init__(self, url: str = None, api_key: str = None):
        self.url = url or settings.QDRANT_URL
        self.api_key = api_key or settings.QDRANT_API_KEY
        self.collection_name = settings.QDRANT_COLLECTION_PREFIX

        # Initialize Qdrant Client
        if self.api_key:
            self.client = QdrantClient(url=self.url, api_key=self.api_key)
        else:
            self.client = QdrantClient(url=self.url)

    def ensure_collection_exists(self, vector_size: int = 1536):
        """Ensures Qdrant collection exists with proper vector index config."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=vector_size,
                        distance=models.Distance.COSINE
                    )
                )
                # Create payload index for fast filtering by repository_id
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="repository_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
        except Exception as e:
            # Fallback for cloud/local connection initialization error handling
            pass

    def upsert_chunks(self, chunks: List[ChunkMetadata], embeddings: List[List[float]]):
        """Upserts code chunks and vector embeddings into Qdrant."""
        if not chunks or len(chunks) != len(embeddings):
            return

        self.ensure_collection_exists(vector_size=len(embeddings[0]))
        points: List[models.PointStruct] = []

        for chunk, vector in zip(chunks, embeddings):
            # Generate UUID v5 based on chunk_id string for deterministic Qdrant point ID
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk.chunk_id))

            payload = {
                "chunk_id": chunk.chunk_id,
                "repository_id": chunk.repository_id,
                "file_path": chunk.file_path,
                "language": chunk.language,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "symbol_name": chunk.symbol_name,
                "symbol_type": chunk.symbol_type,
                "source_type": chunk.source_type,
                "commit_sha": chunk.commit_sha,
                "chunk_content": chunk.content,
            }

            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            )

        # Batch upsert points
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch
            )

    def search_similar(self, query_vector: List[float], repository_id: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Performs cosine similarity vector search filtered strictly by repository_id.
        """
        self.ensure_collection_exists(vector_size=len(query_vector))

        repo_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="repository_id",
                    match=models.MatchValue(value=repository_id)
                )
            ]
        )

        search_result = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=repo_filter,
            limit=limit,
            with_payload=True
        )

        results = []
        for hit in search_result:
            payload = hit.payload or {}
            payload["score"] = hit.score
            results.append(payload)

        return results

    def delete_repository(self, repository_id: str):
        """Purges all vector points associated with a repository_id."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="repository_id",
                                match=models.MatchValue(value=repository_id)
                            )
                        ]
                    )
                )
            )
        except Exception:
            pass

    def get_repository_files(self, repository_id: str) -> List[Dict[str, Any]]:
        """Scrolls collection payload to aggregate unique repository files."""
        try:
            scroll_result, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="repository_id",
                            match=models.MatchValue(value=repository_id)
                        )
                    ]
                ),
                limit=1000,
                with_payload=True,
                with_vectors=False
            )

            files_map: Dict[str, Dict[str, Any]] = {}
            for point in scroll_result:
                payload = point.payload or {}
                fpath = payload.get("file_path")
                if not fpath:
                    continue

                if fpath not in files_map:
                    files_map[fpath] = {
                        "file_path": fpath,
                        "language": payload.get("language", "unknown"),
                        "chunk_count": 0,
                        "start_line": payload.get("start_line", 1),
                        "end_line": payload.get("end_line", 1)
                    }
                files_map[fpath]["chunk_count"] += 1
                files_map[fpath]["end_line"] = max(files_map[fpath]["end_line"], payload.get("end_line", 1))

            return list(files_map.values())
        except Exception:
            return []
