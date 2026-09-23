import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Codebase RAG Assistant"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # OpenAI Credentials & Models
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_MODEL: str = "gpt-4o-mini"

    # Qdrant Vector Database
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION_PREFIX: str = "repo_chunks"

    # GitHub API Configuration
    GITHUB_TOKEN: Optional[str] = None

    # Safety & Cost Control Limits
    MAX_REPO_SIZE_MB: int = 50
    MAX_FILE_COUNT: int = 500
    MAX_FILE_SIZE_KB: int = 500
    MAX_CHUNK_COUNT: int = 2000
    MAX_CHAT_INPUT_CHARS: int = 2000

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
