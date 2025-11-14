import { ai, EMBEDDING_MODEL, withRetry } from "./gemini";
import { supabase, DOCUMENTS_TABLE } from "./supabase";

/**
 * Embeds a single text string using the Gemini embedding model.
 * Includes retry logic for handling transient API errors (503, etc.).
 * @param text The text to embed.
 * @returns A promise that resolves to the embedding vector (number[]).
 */
async function embedText(text: string): Promise<number[]> {
  const response = await withRetry(
    async () => {
      return await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [text], // Use 'contents' array
      });
    },
    3,
    "Embedding generation"
  );

  // The response contains an array of embeddings, we take the first one.
  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error("Failed to generate embedding for text.");
  }
  return embedding;
}

/**
 * Performs retrieval-augmented generation (RAG) by finding relevant context
 * for a given user query using Supabase vector search.
 * @param query The user's question.
 * @param k The number of top relevant chunks to retrieve.
 * @returns An array of relevant text chunks.
 */
export async function retrieveContext(query: string, language: string, k: number = 2): Promise<string[]> {
  // 1. Embed the user query
  const queryVector = await embedText(query);

  // 2. Perform vector similarity search in Supabase
  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: queryVector,
    match_count: k,
    language, // Pass the language parameter for filtering
    filter: {}, // Optional filter for metadata
  }).select("content");

  if (error) {
    console.error("Supabase retrieval error:", error);
    throw new Error("Failed to retrieve context from knowledge base.");
  }

  // Assert documents is an array for TypeScript
  const relevantDocuments = documents as { content: string }[] | null;

  if (!relevantDocuments || relevantDocuments.length === 0) {
    return ["No relevant documents found in the knowledge base."];
  }

  // 3. Extract and return the content chunks
  const relevantChunks = relevantDocuments.map(doc => doc.content);

  return relevantChunks;
}

// We no longer need initializeRAG() as the data is persistent.
// However, we need a SQL function for vector search.
// The user must execute the following SQL function in Supabase:
/*
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_count int,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN query
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/