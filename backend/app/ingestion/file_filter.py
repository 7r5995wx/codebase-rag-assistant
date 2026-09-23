import os
from typing import Dict, Optional

# Supported extension to language mapping
SUPPORTED_EXTENSIONS: Dict[str, str] = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".h": "cpp",
    ".c": "cpp",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".html": "html",
    ".css": "css",
    ".md": "markdown",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
}

# Directories to strictly ignore
IGNORED_DIRECTORIES = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "vendor",
    "target",  # Rust build dir
    "bin",
    "obj",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".mypy_cache",
    "egg-info",
}

# Specific filenames or patterns to ignore
IGNORED_FILENAMES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "poetry.lock",
    "Pipfile.lock",
    "composer.lock",
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".DS_Store",
    "thumbs.db",
}

# File extensions to ignore (binaries, media, archives)
IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp3", ".mp4", ".mov", ".avi", ".webm",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin",
    ".pyc", ".pyo", ".class", ".o", ".a",
    ".woff", ".woff2", ".ttf", ".eot",
    ".db", ".sqlite", ".sqlite3"
}

def is_ignored_directory(dir_name: str) -> bool:
    """Checks if directory name is in the ignore list."""
    return dir_name in IGNORED_DIRECTORIES or dir_name.startswith(".")


def get_file_language(file_path: str) -> Optional[str]:
    """Returns the language string if file extension is supported, else None."""
    basename = os.path.basename(file_path)
    if basename in IGNORED_FILENAMES:
        return None

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext in IGNORED_EXTENSIONS:
        return None

    return SUPPORTED_EXTENSIONS.get(ext, None)


def determine_source_type(file_path: str, language: str) -> str:
    """
    Categorizes file into 'code', 'documentation', or 'configuration'.
    """
    rel_path = file_path.lower()
    if language == "markdown" or rel_path.startswith("docs/") or "readme" in rel_path:
        return "documentation"
    elif language in ["json", "yaml"] or rel_path.endswith(".config.js") or rel_path.endswith(".config.ts"):
        return "configuration"
    return "code"
