import axios from 'axios';
import { RepoMetadata } from '../types';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const githubAxios = axios.create({
  baseURL: 'https://api.github.com',
  headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {},
});

export function parseGitHubUrl(url: string): { owner: string; repo: string; repositoryId: string } {
  if (!url || typeof url !== 'string') {
    throw new Error('GitHub URL must be a non-empty string.');
  }

  const cleaned = url.trim().replace(/\.git$/, '');
  const match = cleaned.match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/);

  if (!match) {
    throw new Error('Invalid GitHub repository URL format. Example: https://github.com/owner/repository');
  }

  const owner = match[1];
  const repo = match[2];
  const repositoryId = `${owner.toLowerCase()}_${repo.toLowerCase()}`.replace(/[^a-zA-Z0-9_]/g, '_');

  return { owner, repo, repositoryId };
}

export async function fetchRepoMetadata(url: string): Promise<RepoMetadata> {
  const { owner, repo, repositoryId } = parseGitHubUrl(url);

  try {
    const res = await githubAxios.get(`/repos/${owner}/${repo}`);
    const data = res.data;
    const defaultBranch = data.default_branch || 'main';

    let commitSha = '';
    try {
      const commitRes = await githubAxios.get(`/repos/${owner}/${repo}/commits/${defaultBranch}`);
      commitSha = (commitRes.data?.sha || '').substring(0, 7);
    } catch (e) {
      commitSha = 'main';
    }

    return {
      owner,
      repo,
      repository_id: repositoryId,
      repository_url: data.html_url || url,
      default_branch: defaultBranch,
      description: data.description || '',
      primary_language: data.language || 'Unknown',
      stars: data.stargazers_count || 0,
      file_count: 0,
      total_size_kb: data.size || 0,
      estimated_chunks: 0,
      commit_sha: commitSha,
    };
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw new Error(`GitHub repository '${owner}/${repo}' not found or is private.`);
    }
    // Fallback if GitHub API rate-limited
    return {
      owner,
      repo,
      repository_id: repositoryId,
      repository_url: `https://github.com/${owner}/${repo}`,
      default_branch: 'main',
      description: `GitHub repository ${owner}/${repo}`,
      primary_language: 'Code',
      stars: 0,
      file_count: 0,
      total_size_kb: 0,
      estimated_chunks: 0,
      commit_sha: 'main',
    };
  }
}

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.h': 'cpp',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.html': 'html',
  '.css': 'css',
  '.md': 'markdown',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
};

const IGNORED_DIRECTORIES = new Set([
  '.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '__pycache__',
  '.venv', 'venv', 'vendor', 'target', 'bin', 'obj', '.idea', '.vscode', '.pytest_cache'
]);

export function getFileLanguage(filePath: string): string | null {
  const parts = filePath.split('/');
  for (const p of parts) {
    if (IGNORED_DIRECTORIES.has(p) || p.startsWith('.')) {
      return null;
    }
  }

  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || null;
}

export async function fetchRepoTreeFiles(owner: string, repo: string, branch: string): Promise<{ path: string; language: string }[]> {
  try {
    const res = await githubAxios.get(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    const tree = res.data?.tree || [];
    
    const validFiles: { path: string; language: string }[] = [];
    for (const item of tree) {
      if (item.type === 'blob') {
        const lang = getFileLanguage(item.path);
        if (lang) {
          validFiles.push({ path: item.path, language: lang });
        }
      }
      if (validFiles.length >= 200) break; // Limit to 200 files
    }
    return validFiles;
  } catch (err) {
    return [];
  }
}

export async function fetchRawFileContent(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const res = await axios.get(rawUrl, { responseType: 'text', timeout: 5000 });
    return res.data;
  } catch (err) {
    return '';
  }
}
