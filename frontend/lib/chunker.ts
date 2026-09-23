import crypto from 'crypto';

export interface CodeChunk {
  chunk_id: string;
  repository_id: string;
  file_path: string;
  language: string;
  start_line: number;
  end_line: number;
  symbol_name?: string;
  symbol_type?: string;
  source_type: string;
  commit_sha: string;
  content: string;
}

export function generateChunkId(repositoryId: string, filePath: string, startLine: number, endLine: number, content: string): string {
  const raw = `${repositoryId}:${filePath}:${startLine}:${endLine}:${content.trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
}

export function determineSourceType(filePath: string, language: string): string {
  const lower = filePath.toLowerCase();
  if (language === 'markdown' || lower.includes('readme') || lower.startsWith('docs/')) {
    return 'documentation';
  }
  if (language === 'json' || language === 'yaml' || lower.endsWith('.config.js') || lower.endsWith('.config.ts')) {
    return 'configuration';
  }
  return 'code';
}

export function chunkFileContent(
  repositoryId: string,
  filePath: string,
  content: string,
  language: string,
  commitSha: string = '',
  targetLines: number = 40,
  overlapLines: number = 10
): CodeChunk[] {
  if (!content || !content.trim()) return [];

  const lines = content.split('\n');
  const totalLines = lines.length;
  const sourceType = determineSourceType(filePath, language);
  const chunks: CodeChunk[] = [];

  const step = Math.max(1, targetLines - overlapLines);
  for (let startIdx = 0; startIdx < totalLines; startIdx += step) {
    const endIdx = Math.min(startIdx + targetLines, totalLines);
    const chunkLines = lines.slice(startIdx, endIdx);
    const chunkText = chunkLines.join('\n');

    if (!chunkText.trim()) continue;

    const startLine = startIdx + 1;
    const endLine = endIdx;
    const chunkId = generateChunkId(repositoryId, filePath, startLine, endLine, chunkText);

    chunks.push({
      chunk_id: chunkId,
      repository_id: repositoryId,
      file_path: filePath,
      language: language,
      start_line: startLine,
      end_line: endLine,
      symbol_name: undefined,
      symbol_type: 'block',
      source_type: sourceType,
      commit_sha: commitSha,
      content: chunkText,
    });

    if (endIdx >= totalLines) break;
  }

  return chunks;
}
