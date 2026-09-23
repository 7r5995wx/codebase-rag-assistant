import { NextRequest, NextResponse } from 'next/server';
import { fetchRepoMetadata } from '@/lib/github';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;

    if (!url) {
      return NextResponse.json({ detail: 'GitHub URL is required.' }, { status: 400 });
    }

    const metadata = await fetchRepoMetadata(url);
    return NextResponse.json(metadata);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || 'Failed to analyze repository.' },
      { status: 400 }
    );
  }
}
