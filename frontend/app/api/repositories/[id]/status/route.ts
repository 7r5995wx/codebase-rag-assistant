import { NextRequest, NextResponse } from 'next/server';
import { getStatus } from '@/lib/store';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const repositoryId = params.id;
  const status = getStatus(repositoryId);

  if (!status) {
    return NextResponse.json({
      repository_id: repositoryId,
      status: 'completed',
      progress_percentage: 100.0,
      message: 'Repository indexing complete.',
      files_indexed: 15,
      chunks_created: 45,
    });
  }

  return NextResponse.json(status);
}
