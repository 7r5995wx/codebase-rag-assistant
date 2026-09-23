import openai
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.models.schemas import ChatMessage, SourceCitation, ChatResponse
from app.rag.retriever import RAGRetriever

SYSTEM_PROMPT = """You are an expert AI Software Engineering Assistant specializing in codebase analysis and technical explanation.

Your primary directive is to answer user questions accurately based ONLY on the retrieved repository code and documentation context provided below.

RULES & CONSTRAINTS:
1. Grounding: Every claim, function, file, or architectural detail you explain must come directly from the provided retrieved context. Do NOT invent or hallucinate code, files, or parameters.
2. Insufficient Context: If the retrieved context does not contain enough information to answer the question, state clearly: "Based on the retrieved repository files, I cannot find sufficient context to answer this question." Do NOT make up dummy logic.
3. Citations: Reference the exact file path and line numbers when discussing code snippets.
4. Formatting: Use clean markdown syntax with code blocks (specifying language where applicable).
5. Security: Never output or leak environment variables, tokens, API keys, or private credentials.
"""


class GroundedRAGChain:
    def __init__(self, retriever: RAGRetriever, api_key: str = None):
        self.retriever = retriever
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = settings.LLM_MODEL

    async def answer_question(
        self,
        query: str,
        repository_id: str,
        history: List[ChatMessage] = []
    ) -> ChatResponse:
        """
        Executes grounded RAG pipeline: Query -> Retrieval -> Context Assembly -> LLM -> Citations.
        """
        if not self.api_key:
            raise ValueError("OpenAI API key is missing. Set OPENAI_API_KEY environment variable.")

        # 1. Retrieve top context snippets from Qdrant
        context_snippets = await self.retriever.retrieve_context(query, repository_id, top_k=8)

        # 2. Build structured context block & extract citations
        context_str_parts = []
        citations: List[SourceCitation] = []
        seen_citations = set()

        for idx, item in enumerate(context_snippets, 1):
            fpath = item.get("file_path", "unknown")
            sline = item.get("start_line", 1)
            eline = item.get("end_line", 1)
            symbol_name = item.get("symbol_name")
            symbol_type = item.get("symbol_type")
            source_type = item.get("source_type", "code")
            content = item.get("chunk_content", "")

            context_str_parts.append(
                f"--- CONTEXT SNIPPET #{idx} ---\n"
                f"File: {fpath} (Lines {sline}-{eline})\n"
                f"Symbol: {symbol_name or 'N/A'} (Type: {symbol_type or 'N/A'})\n"
                f"Content:\n{content}\n"
            )

            cit_key = f"{fpath}:{sline}-{eline}"
            if cit_key not in seen_citations:
                seen_citations.add(cit_key)
                citations.append(
                    SourceCitation(
                        file_path=fpath,
                        start_line=sline,
                        end_line=eline,
                        symbol_name=symbol_name,
                        symbol_type=symbol_type,
                        source_type=source_type,
                        snippet=content[:300] + ("..." if len(content) > 300 else "")
                    )
                )

        formatted_context = "\n".join(context_str_parts)

        # 3. Assemble chat prompt history (limiting to last 4 turns for context length management)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Include past turns
        recent_history = history[-4:] if history else []
        for msg in recent_history:
            messages.append({"role": msg.role, "content": msg.content})

        # Append current turn with context
        user_prompt = (
            f"RETIREVED CODEBASE CONTEXT:\n"
            f"{formatted_context if formatted_context else 'No context found.'}\n\n"
            f"USER QUESTION:\n{query}"
        )
        messages.append({"role": "user", "content": user_prompt})

        # 4. Invoke LLM
        client = openai.AsyncOpenAI(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2,
            max_tokens=1500
        )

        answer_text = response.choices[0].message.content or "No answer generated."

        return ChatResponse(
            answer=answer_text,
            sources=citations
        )
