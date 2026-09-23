import openai
from typing import List
from app.core.config import settings


class EmbeddingService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = settings.EMBEDDING_MODEL

    async def generate_embedding(self, text: str) -> List[float]:
        """Generates embedding vector for a single text query or snippet."""
        if not self.api_key:
            raise ValueError("OpenAI API key is missing. Set OPENAI_API_KEY environment variable in backend/.env")

        client = openai.AsyncOpenAI(api_key=self.api_key)
        clean_text = text.replace("\n", " ")
        
        try:
            response = await client.embeddings.create(
                input=[clean_text],
                model=self.model
            )
            return response.data[0].embedding
        except openai.RateLimitError as e:
            if "insufficient_quota" in str(e) or "credit_balance_exhausted" in str(e):
                raise ValueError("OpenAI API quota exhausted. Please check your billing/credits at platform.openai.com/settings/organization/billing")
            raise ValueError(f"OpenAI Rate Limit error: {str(e)}")
        except openai.AuthenticationError:
            raise ValueError("Invalid OpenAI API key. Please check OPENAI_API_KEY in backend/.env")
        except Exception as e:
            raise ValueError(f"OpenAI Embedding error: {str(e)}")

    async def generate_embeddings_batch(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Generates embedding vectors for a list of texts in batches."""
        if not texts:
            return []

        if not self.api_key:
            raise ValueError("OpenAI API key is missing. Set OPENAI_API_KEY environment variable in backend/.env")

        client = openai.AsyncOpenAI(api_key=self.api_key)
        all_embeddings: List[List[float]] = []

        try:
            for i in range(0, len(texts), batch_size):
                batch = [t.replace("\n", " ") for t in texts[i:i + batch_size]]
                response = await client.embeddings.create(
                    input=batch,
                    model=self.model
                )
                batch_vectors = [item.embedding for item in response.data]
                all_embeddings.extend(batch_vectors)
            return all_embeddings
        except openai.RateLimitError as e:
            if "insufficient_quota" in str(e) or "credit_balance_exhausted" in str(e):
                raise ValueError("OpenAI API quota exhausted. Please add credits at platform.openai.com/settings/organization/billing")
            raise ValueError(f"OpenAI Rate Limit error: {str(e)}")
        except openai.AuthenticationError:
            raise ValueError("Invalid OpenAI API key. Please check OPENAI_API_KEY in backend/.env")
        except Exception as e:
            raise ValueError(f"OpenAI Embedding error: {str(e)}")
