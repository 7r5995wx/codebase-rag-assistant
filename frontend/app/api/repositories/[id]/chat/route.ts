import { NextRequest, NextResponse } from 'next/server';
import { openaiClient, EMBEDDING_MODEL, LLM_MODEL } from '@/lib/openai';
import { qdrantClient, COLLECTION_NAME } from '@/lib/qdrant';

const SYSTEM_PROMPT = `You are an expert AI Software Engineering Assistant specializing in codebase analysis and technical explanation.

Your primary directive is to answer user questions accurately based ONLY on the retrieved repository code and documentation context provided below.

RULES & CONSTRAINTS:
1. Grounding: Every claim, function, file, or architectural detail you explain must come directly from the provided retrieved context. Do NOT invent or hallucinate code, files, or parameters.
2. Insufficient Context: If the retrieved context does not contain enough information to answer the question, state clearly: "Based on the retrieved repository files, I cannot find sufficient context to answer this question." Do NOT make up dummy logic.
3. Citations: Reference the exact file path and line numbers when discussing code snippets.
4. Formatting: Use clean markdown syntax with code blocks (specifying language where applicable).
5. Security: Never output or leak environment variables, tokens, API keys, or private credentials.
`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const repositoryId = params.id;
    const body = await req.json();
    const query = body?.message;
    const history = body?.history || [];

    if (!query) {
      return NextResponse.json({ detail: 'Chat message is required.' }, { status: 400 });
    }

    // 1. Embed user query via OpenAI
    let queryVector: number[] = [];
    try {
      const embRes = await openaiClient.embeddings.create({
        model: EMBEDDING_MODEL,
        input: [query.replace(/\n/g, ' ')],
      });
      queryVector = embRes.data[0].embedding;
    } catch (err: any) {
      return NextResponse.json({
        answer: `⚠️ **OpenAI Billing Notice**: Your OpenAI API key has 0 remaining credits or has exceeded its billing quota. Please add credits at [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing) to enable live vector embeddings and chat completions.`,
        sources: []
      });
    }

    // 2. Perform Qdrant vector search
    let searchHits: any[] = [];
    try {
      const res = await qdrantClient.query(COLLECTION_NAME, {
        query: queryVector,
        filter: {
          must: [
            {
              key: 'repository_id',
              match: { value: repositoryId },
            },
          ],
        },
        limit: 8,
        with_payload: true,
      });
      searchHits = res.points || [];
    } catch (err) {
      // Fallback search without filter if collection filter differs
      try {
        const res = await qdrantClient.query(COLLECTION_NAME, {
          query: queryVector,
          limit: 6,
          with_payload: true,
        });
        searchHits = res.points || [];
      } catch (e) {
        searchHits = [];
      }
    }

    // 3. Build context & citations
    const contextParts: string[] = [];
    const citations: any[] = [];
    const seen = new Set<string>();

    searchHits.forEach((hit, idx) => {
      const p = hit.payload || {};
      const fpath = p.file_path || 'unknown';
      const sline = p.start_line || 1;
      const eline = p.end_line || 1;
      const content = p.chunk_content || '';

      contextParts.push(
        `--- CONTEXT SNIPPET #${idx + 1} ---\nFile: ${fpath} (Lines ${sline}-${eline})\nContent:\n${content}\n`
      );

      const citKey = `${fpath}:${sline}-${eline}`;
      if (!seen.has(citKey)) {
        seen.add(citKey);
        citations.push({
          file_path: fpath,
          start_line: sline,
          end_line: eline,
          symbol_name: p.symbol_name || null,
          symbol_type: p.symbol_type || 'block',
          source_type: p.source_type || 'code',
          snippet: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
        });
      }
    });

    const formattedContext = contextParts.join('\n');

    // 4. Construct LLM prompt
    const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Include recent history turns
    history.slice(-4).forEach((msg: any) => {
      messages.push({ role: msg.role, content: msg.content });
    });

    messages.push({
      role: 'user',
      content: `RETRIEVED CODEBASE CONTEXT:\n${formattedContext || 'No code context found.'}\n\nUSER QUESTION:\n${query}`,
    });

    // 5. Invoke LLM
    const completion = await openaiClient.chat.completions.create({
      model: LLM_MODEL,
      messages: messages,
      temperature: 0.2,
      max_tokens: 1500,
    });

    const answerText = completion.choices[0]?.message?.content || 'No answer generated.';

    return NextResponse.json({
      answer: answerText,
      sources: citations,
    });
  } catch (err: any) {
    return NextResponse.json({
      answer: `⚠️ **API Error**: ${err.message || 'Failed to process chat query.'}`,
      sources: [],
    });
  }
}
