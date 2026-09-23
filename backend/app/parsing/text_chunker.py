import hashlib
from typing import List
from app.models.schemas import ChunkMetadata
from app.ingestion.file_filter import determine_source_type


def generate_chunk_id(repository_id: str, file_path: str, start_line: int, end_line: int, content: str) -> str:
    """Generates a deterministic SHA256 hash ID for deduplication."""
    raw = f"{repository_id}:{file_path}:{start_line}:{end_line}:{content.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def chunk_text_file(
    repository_id: str,
    file_path: str,
    content: str,
    language: str,
    commit_sha: str = "",
    target_lines: int = 50,
    overlap_lines: int = 10
) -> List[ChunkMetadata]:
    """
    Intelligent line-based sliding window text chunker for documentation, configs, or fallback files.
    """
    lines = content.splitlines()
    if not lines:
        return []

    source_type = determine_source_type(file_path, language)
    chunks: List[ChunkMetadata] = []
    total_lines = len(lines)

    step = max(1, target_lines - overlap_lines)
    for start_idx in range(0, total_lines, step):
        end_idx = min(start_idx + target_lines, total_lines)
        chunk_lines = lines[start_idx:end_idx]
        chunk_text = "\n".join(chunk_lines)

        if not chunk_text.strip():
            continue

        start_line = start_idx + 1
        end_line = end_idx

        chunk_id = generate_chunk_id(repository_id, file_path, start_line, end_line, chunk_text)

        chunks.append(
            ChunkMetadata(
                chunk_id=chunk_id,
                repository_id=repository_id,
                file_path=file_path,
                language=language,
                start_line=start_line,
                end_line=end_line,
                symbol_name=None,
                symbol_type="block",
                source_type=source_type,
                commit_sha=commit_sha,
                content=chunk_text
            )
        )

        if end_idx >= total_lines:
            break

    return chunks
