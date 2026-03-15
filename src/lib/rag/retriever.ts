import { createClient } from "@/utils/supabase/server";
import { getEmbeddings } from "../ingestion/embedder";

export interface CodeMatch {
  id: string;
  repo_id: string;
  file_path: string;
  content: string;
  metadata: any;
  similarity: number;
}

/**
 * Perform a vector similarity search on a specific user repository.
 */
export async function searchCodebase(query: string, repoId: string, limit = 5): Promise<CodeMatch[]> {
  const supabase = await createClient();

  // 1. Embed the user's natural language query using the exact same embedder
  const embedder = getEmbeddings();
  const [queryEmbedding] = await embedder.embedDocuments([query]);

  // 2. Query Supabase using the match_code_chunks RPC
  const { data: matches, error } = await supabase.rpc("match_code_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7, // Only return reasonably good matches
    match_count: limit,
    p_repo_id: repoId,
  });

  if (error) {
    console.error("Vector search failed:", error);
    throw new Error("Failed to search codebase context.");
  }

  return matches as CodeMatch[];
}
