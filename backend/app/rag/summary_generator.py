import openai
from typing import List, Dict, Any
from app.core.config import settings
from app.models.schemas import RepoSummaryResponse
from app.rag.vector_store import QdrantVectorStore


class RepoSummaryGenerator:
    def __init__(self, vector_store: QdrantVectorStore, api_key: str = None):
        self.vector_store = vector_store
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = settings.LLM_MODEL

    async def generate_summary(self, repository_id: str, repo_name: str) -> RepoSummaryResponse:
        """
        Generates a grounded architectural summary of the indexed repository based on key file chunks.
        """
        files = self.vector_store.get_repository_files(repository_id)
        if not files:
            return RepoSummaryResponse(
                repository_id=repository_id,
                repo_name=repo_name,
                overview="Repository is empty or not yet indexed.",
                tech_stack=[],
                key_directories=[],
                entry_points=[],
                architecture="No architecture data available."
            )

        file_paths = [f["file_path"] for f in files]
        file_summary_list = "\n".join(file_paths[:100])

        if not self.api_key:
            # Fallback if no OpenAI key is set
            return RepoSummaryResponse(
                repository_id=repository_id,
                repo_name=repo_name,
                overview=f"Repository '{repo_name}' contains {len(files)} indexed files.",
                tech_stack=["Unknown"],
                key_directories=list(set(fp.split("/")[0] for fp in file_paths if "/" in fp))[:5],
                entry_points=[fp for fp in file_paths if "main" in fp or "index" in fp or "app" in fp][:5],
                architecture="Automated structural summary based on file paths."
            )

        prompt = f"""You are analyzing the structure of the GitHub repository '{repo_name}'.
Below is the list of indexed file paths in the codebase:

{file_summary_list}

Based ONLY on these file paths:
1. Provide a concise overall project overview (2-3 sentences).
2. Identify primary tech stack elements (e.g. TypeScript, React, Python, FastAPI, Go, Rust, Docker, etc.).
3. List key top-level directories and their likely roles.
4. List main application entry point files.
5. Provide a short description of the software architecture.

Format your response in JSON format with key fields:
"overview": string,
"tech_stack": list of strings,
"key_directories": list of strings,
"entry_points": list of strings,
"architecture": string
"""

        client = openai.AsyncOpenAI(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": "You are a software architect. Output JSON only."},
                      {"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        import json
        try:
            parsed = json.loads(response.choices[0].message.content or "{}")
            return RepoSummaryResponse(
                repository_id=repository_id,
                repo_name=repo_name,
                overview=parsed.get("overview", "Repository analysis complete."),
                tech_stack=parsed.get("tech_stack", []),
                key_directories=parsed.get("key_directories", []),
                entry_points=parsed.get("entry_points", []),
                architecture=parsed.get("architecture", "Component-based architecture.")
            )
        except Exception:
            return RepoSummaryResponse(
                repository_id=repository_id,
                repo_name=repo_name,
                overview=f"Repository contains {len(files)} indexed files.",
                tech_stack=[],
                key_directories=[],
                entry_points=[],
                architecture="Architectural parsing complete."
            )
