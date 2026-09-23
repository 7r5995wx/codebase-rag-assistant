from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RepoAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Public GitHub repository URL")


class RepoMetadata(BaseModel):
    owner: str
    repo: str
    repository_id: str
    repository_url: str
    default_branch: str = "main"
    description: Optional[str] = None
    primary_language: Optional[str] = "Unknown"
    stars: int = 0
    file_count: int = 0
    total_size_kb: int = 0
    estimated_chunks: int = 0
    commit_sha: Optional[str] = None


class RepoIndexRequest(BaseModel):
    url: str = Field(..., description="Public GitHub repository URL")
    force_reindex: bool = False


class IndexingProgress(BaseModel):
    repository_id: str
    status: str  # "queued", "fetching", "analyzing", "parsing", "embedding", "vectorizing", "summarizing", "completed", "failed"
    progress_percentage: float = 0.0
    message: str = "Initializing..."
    files_indexed: int = 0
    chunks_created: int = 0
    error: Optional[str] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question about the codebase")
    history: List[ChatMessage] = Field(default=[], description="Previous conversation turns")


class SourceCitation(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None
    source_type: str = "code"
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = []


class RepoSummaryResponse(BaseModel):
    repository_id: str
    repo_name: str
    overview: str
    tech_stack: List[str] = []
    key_directories: List[str] = []
    entry_points: List[str] = []
    architecture: str


class RepoFile(BaseModel):
    file_path: str
    language: str
    chunk_count: int = 1
    start_line: int = 1
    end_line: int = 1


class RepoFileListResponse(BaseModel):
    repository_id: str
    files: List[RepoFile] = []


class ChunkMetadata(BaseModel):
    chunk_id: str
    repository_id: str
    file_path: str
    language: str
    start_line: int
    end_line: int
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None
    source_type: str = "code"  # code, documentation, configuration
    commit_sha: Optional[str] = None
    content: str
