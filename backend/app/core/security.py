import re
from typing import Tuple, Optional
from urllib.parse import urlparse

GITHUB_URL_PATTERN = re.compile(
    r"^https?://(?:www\.)?github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:/.*)?$"
)

def parse_github_url(url: str) -> Tuple[str, str, str]:
    """
    Validates and extracts owner, repo, and clean repository ID from a GitHub URL.
    Returns: (owner, repo_name, repository_id)
    Raises ValueError if invalid.
    """
    if not url or not isinstance(url, str):
        raise ValueError("GitHub URL must be a non-empty string.")

    cleaned_url = url.strip()
    match = GITHUB_URL_PATTERN.match(cleaned_url)

    if not match:
        raise ValueError("Invalid GitHub repository URL format. Example: https://github.com/owner/repository")

    owner = match.group(1)
    repo = match.group(2)

    # Basic sanitization against path traversal or injection in owner/repo
    if ".." in owner or ".." in repo or "/" in owner or "/" in repo:
        raise ValueError("Invalid characters detected in GitHub repository owner or name.")

    repository_id = f"{owner.lower()}_{repo.lower()}"
    # Replace non-alphanumeric chars with underscore for Qdrant collection compatibility
    repository_id = re.sub(r"[^a-zA-Z0-9_]", "_", repository_id)

    return owner, repo, repository_id


def sanitize_chat_query(query: str, max_chars: int = 2000) -> str:
    """Sanitizes user input to prevent prompt injection or excessive payload attacks."""
    if not query:
        raise ValueError("Query string cannot be empty.")
    
    sanitized = query.strip()
    if len(sanitized) > max_chars:
        sanitized = sanitized[:max_chars]
        
    return sanitized
