import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchRepoMetadata, fetchRepoTreeFiles, fetchRawFileContent } from '@/lib/github';
import { chunkFileContent, CodeChunk } from '@/lib/chunker';
import { generateGeminiEmbeddings } from '@/lib/gemini';
import { qdrantClient, COLLECTION_NAME } from '@/lib/qdrant';
import { setStatus, updateStatus } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;

    if (!url) {
      return NextResponse.json({ detail: 'GitHub URL is required.' }, { status: 400 });
    }

    const { owner, repo, repositoryId } = parseGitHubUrl(url);

    // Initial status
    setStatus(repositoryId, {
      status: 'analyzing',
      progress_percentage: 15.0,
      message: 'Fetching repository file tree...',
      files_indexed: 0,
      chunks_created: 0,
    });

    // Execute indexing pipeline in background promise
    (async () => {
      try {
        const meta = await fetchRepoMetadata(url);
        const branch = meta.default_branch || 'main';

        updateStatus(repositoryId, {
          status: 'parsing',
          progress_percentage: 35.0,
          message: 'Scanning and chunking source files...',
        });

        const treeFiles = await fetchRepoTreeFiles(owner, repo, branch);
        const allChunks: CodeChunk[] = [];

        const targetFiles = treeFiles.slice(0, 30);
        const contents = await Promise.all(
          targetFiles.map((file) => fetchRawFileContent(owner, repo, branch, file.path))
        );

        targetFiles.forEach((file, idx) => {
          const content = contents[idx];
          if (content) {
            const fileChunks = chunkFileContent(repositoryId, file.path, content, file.language, meta.commit_sha || '');
            allChunks.push(...fileChunks);
          }
        });

        updateStatus(repositoryId, {
          files_indexed: Math.min(30, treeFiles.length),
          chunks_created: allChunks.length,
        });

        if (allChunks.length === 0) {
          setStatus(repositoryId, {
            status: 'failed',
            progress_percentage: 100.0,
            message: 'No code files found to index.',
            files_indexed: 0,
            chunks_created: 0,
            error: 'No supported source files could be fetched.',
          });
          return;
        }

        // Generate embeddings via Google Gemini
        updateStatus(repositoryId, {
          status: 'embedding',
          progress_percentage: 65.0,
          message: `Generating vector embeddings for ${allChunks.length} chunks via Gemini...`,
        });

        const texts = allChunks.map((c) => c.content.replace(/\n/g, ' '));
        const vectors = await generateGeminiEmbeddings(texts);

        // Upsert to Qdrant Vector DB
        updateStatus(repositoryId, {
          status: 'vectorizing',
          progress_percentage: 85.0,
          message: 'Upserting vectors into Qdrant Cloud Database...',
        });

        try {
          await qdrantClient.getCollection(COLLECTION_NAME);
        } catch (e) {
          await qdrantClient.createCollection(COLLECTION_NAME, {
            vectors: {
              size: vectors[0].length,
              distance: 'Cosine',
            },
          });
        }

        const points = allChunks.map((chunk, idx) => {
          return {
            id: String(idx + 1),
            vector: vectors[idx],
            payload: {
              chunk_id: chunk.chunk_id,
              repository_id: chunk.repository_id,
              file_path: chunk.file_path,
              language: chunk.language,
              start_line: chunk.start_line,
              end_line: chunk.end_line,
              symbol_name: chunk.symbol_name || null,
              symbol_type: chunk.symbol_type || 'block',
              source_type: chunk.source_type,
              commit_sha: chunk.commit_sha,
              chunk_content: chunk.content,
            },
          };
        });

        await qdrantClient.upsert(COLLECTION_NAME, {
          wait: true,
          points: points,
        });

        setStatus(repositoryId, {
          status: 'completed',
          progress_percentage: 100.0,
          message: 'Repository indexing complete.',
          files_indexed: Math.min(30, treeFiles.length),
          chunks_created: allChunks.length,
        });
      } catch (err: any) {
        const isQuotaError = err.status === 429 || err.message?.includes('quota') || err.message?.includes('credits');
        const errMsg = isQuotaError
          ? 'OpenAI API Quota Exceeded: 0 credits remaining on your OpenAI API account. Please add credits at https://platform.openai.com/settings/organization/billing to generate embeddings.'
          : err.message || 'Failed to index repository.';

        setStatus(repositoryId, {
          status: 'failed',
          progress_percentage: 100.0,
          message: `Indexing failed: ${errMsg}`,
          files_indexed: 0,
          chunks_created: 0,
          error: errMsg,
        });
      }
    })();

    return NextResponse.json({
      repository_id: repositoryId,
      status: 'analyzing',
      progress_percentage: 15.0,
      message: 'Indexing initiated...',
      files_indexed: 0,
      chunks_created: 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || 'Failed to start indexing.' },
      { status: 400 }
    );
  }
}
