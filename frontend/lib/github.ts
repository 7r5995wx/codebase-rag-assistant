import axios from 'axios';
import { RepoMetadata } from '../types';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const githubAxios = axios.create({
  baseURL: 'https://api.github.com',
  headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {},
});

async function safeGithubGet(endpoint: string) {
  try {
    return await githubAxios.get(endpoint);
  } catch (err: any) {
    if (GITHUB_TOKEN && (err.response?.status === 400 || err.response?.status === 401 || err.response?.status === 403)) {
      return await axios.get(`https://api.github.com${endpoint}`);
    }
    throw err;
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string; repositoryId: string } {
  if (!url || typeof url !== 'string') {
    throw new Error('GitHub URL must be a non-empty string.');
  }

  let cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://github.com/${cleaned}`;
  }

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
    const res = await safeGithubGet(`/repos/${owner}/${repo}`);
    const data = res.data;
    const defaultBranch = data.default_branch || 'main';

    let commitSha = '';
    try {
      const commitRes = await safeGithubGet(`/repos/${owner}/${repo}/commits/${defaultBranch}`);
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
    if (IGNORED_DIRECTORIES.has(p)) {
      return null;
    }
  }

  const filename = parts[parts.length - 1];
  if (filename.startsWith('.') && !filename.endsWith('.json') && !filename.endsWith('.md')) {
    return null;
  }

  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || null;
}

export async function fetchRepoTreeFiles(owner: string, repo: string, branch: string): Promise<{ path: string; language: string }[]> {
  const branchesToTry = Array.from(new Set([branch, 'main', 'master', 'dev', 'trunk']));

  for (const b of branchesToTry) {
    try {
      const res = await safeGithubGet(`/repos/${owner}/${repo}/git/trees/${b}?recursive=1`);
      const tree = res.data?.tree || [];
      
      const validFiles: { path: string; language: string }[] = [];
      for (const item of tree) {
        if (item.type === 'blob') {
          const lang = getFileLanguage(item.path);
          if (lang) {
            validFiles.push({ path: item.path, language: lang });
          }
        }
        if (validFiles.length >= 200) break;
      }
      if (validFiles.length > 0) return validFiles;
    } catch (err: any) {
      console.warn(`GitHub tree API failed for branch ${b}:`, err.message);
    }
  }

  // Fallback: Return common project entry files
  const COMMON_PATHS = [
    'README.md', 'package.json', 'src/app/page.tsx', 'src/app/layout.tsx',
    'src/index.ts', 'src/index.tsx', 'src/main.ts', 'src/App.tsx',
    'src/components/Navbar.tsx', 'app/page.tsx', 'main.py', 'app.py',
    'go.mod', 'Cargo.toml'
  ];

  const fallbackFiles: { path: string; language: string }[] = [];
  for (const path of COMMON_PATHS) {
    const lang = getFileLanguage(path);
    if (lang) {
      fallbackFiles.push({ path, language: lang });
    }
  }

  return fallbackFiles;
}

export async function fetchRawFileContent(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
  const branchesToTry = Array.from(new Set([branch, 'main', 'master']));
  for (const b of branchesToTry) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${filePath}`;
      const res = await axios.get(rawUrl, { responseType: 'text', timeout: 5000 });
      if (res.data) return res.data;
    } catch (err) {
      // try next branch
    }
  }
  return '';
}
