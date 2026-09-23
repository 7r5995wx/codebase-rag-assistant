import os
import shutil
import tempfile
import asyncio
import httpx
from typing import Dict, Any, Optional, List, Tuple
from app.core.config import settings
from app.core.security import parse_github_url
from app.models.schemas import RepoMetadata
from app.ingestion.file_filter import get_file_language, is_ignored_directory


class GitHubIngestionService:
    def __init__(self):
        self.github_token = settings.GITHUB_TOKEN
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if self.github_token:
            self.headers["Authorization"] = f"Bearer {self.github_token}"

    async def fetch_repository_metadata(self, url: str) -> RepoMetadata:
        """
        Fetches repository metadata from GitHub REST API.
        """
        owner, repo, repository_id = parse_github_url(url)
        api_url = f"https://api.github.com/repos/{owner}/{repo}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(api_url, headers=self.headers)
            
            if response.status_code == 404:
                raise ValueError(f"GitHub repository '{owner}/{repo}' not found or is private.")
            elif response.status_code != 200:
                raise ValueError(f"GitHub API error ({response.status_code}): {response.text}")

            data = response.json()
            default_branch = data.get("default_branch", "main")
            
            # Fetch latest commit SHA
            commit_sha = None
            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{default_branch}"
            commit_resp = await client.get(commits_url, headers=self.headers)
            if commit_resp.status_code == 200:
                commit_sha = commit_resp.json().get("sha", "")[:7]

            return RepoMetadata(
                owner=owner,
                repo=repo,
                repository_id=repository_id,
                repository_url=data.get("html_url", url),
                default_branch=default_branch,
                description=data.get("description"),
                primary_language=data.get("language") or "Unknown",
                stars=data.get("stargazers_count", 0),
                total_size_kb=data.get("size", 0),
                commit_sha=commit_sha
            )

    async def clone_repository(self, repository_url: str, target_dir: str) -> str:
        """
        Performs a git shallow clone of the specified public repository into target_dir.
        """
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir, ignore_errors=True)

        os.makedirs(target_dir, exist_ok=True)

        # Execute git clone --depth 1 safely
        cmd = ["git", "clone", "--depth", "1", repository_url, target_dir]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            raise RuntimeError(f"Failed to clone repository: {err_msg}")

        return target_dir

    def scan_repository_files(self, repo_dir: str) -> List[Tuple[str, str, int]]:
        """
        Scans repository directory and returns list of (relative_path, language, size_bytes).
        Applies strict directory & extension filters.
        """
        valid_files = []
        total_repo_size_bytes = 0

        for root, dirs, files in os.walk(repo_dir):
            # Exclude ignored directories in-place
            dirs[:] = [d for d in dirs if not is_ignored_directory(d)]

            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, repo_dir)
                
                language = get_file_language(rel_path)
                if not language:
                    continue

                try:
                    file_stat = os.stat(full_path)
                    file_size = file_stat.st_size

                    # Enforce max file size check (500 KB limit)
                    if file_size > settings.MAX_FILE_SIZE_KB * 1024:
                        continue

                    total_repo_size_bytes += file_size
                    valid_files.append((rel_path, language, file_size))
                except OSError:
                    continue

                # Enforce total repo limit check
                if len(valid_files) >= settings.MAX_FILE_COUNT:
                    break

        return valid_files
