export interface RepoMetadata {
  owner: string;
  repo: string;
  repository_id: string;
  repository_url: string;
  default_branch: string;
  description?: string;
  primary_language?: string;
  stars: number;
  file_count: number;
  total_size_kb: number;
  estimated_chunks: number;
  commit_sha?: string;
}

export interface IndexingProgress {
  repository_id: string;
  status: 'queued' | 'fetching' | 'analyzing' | 'parsing' | 'embedding' | 'vectorizing' | 'summarizing' | 'completed' | 'failed';
  progress_percentage: number;
  message: string;
  files_indexed: number;
  chunks_created: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  timestamp: string;
}

export interface SourceCitation {
  file_path: string;
  start_line: number;
  end_line: number;
  symbol_name?: string;
  symbol_type?: string;
  source_type: string;
  snippet: string;
}

export interface RepoSummary {
  repository_id: string;
  repo_name: string;
  overview: string;
  tech_stack: string[];
  key_directories: string[];
  entry_points: string[];
  architecture: string;
}

export interface RepoFile {
  file_path: string;
  language: string;
  chunk_count: number;
  start_line: number;
  end_line: number;
}
