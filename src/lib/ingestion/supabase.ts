import { createClient } from "@/utils/supabase/server";
import { CodeChunk } from "./chunker";
import { embedChunks } from "./embedder";

export interface RepoDetails {
  repoUrl: string;
  name: string;
  lastCommitHash: string;
  fileCount: number;
}

/**
 * Ensures a repository is registered in the DB and returns its UUID.
 * Throws an error if the latest commit hash matches what's already embedded.
 */
export async function upsertRepository(details: RepoDetails): Promise<string> {
  const supabase = await createClient();

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user) {
    throw new Error("User must be authenticated to ingest a repository.");
  }
  
  const userId = userResp.user.id;

  // Check if repo already exists for this user
  const { data: existingRepo } = await supabase
    .from("repositories")
    .select("*")
    .eq("repo_url", details.repoUrl)
    .eq("user_id", userId)
    .single();

  if (existingRepo) {
    // Validation: Verify that we aren't re-embedding the same commit hash twice.
    if (existingRepo.last_commit_hash === details.lastCommitHash) {
      throw new Error(`Repository is already up to date with commit ${details.lastCommitHash}. Skipping ingestion.`);
    }

    // Update existing repo details
    const { data: updatedRepo, error: updateErr } = await supabase
      .from("repositories")
      .update({
        last_commit_hash: details.lastCommitHash,
        file_count: details.fileCount,
        name: details.name,
      })
      .eq("id", existingRepo.id)
      .select("id")
      .single();

    if (updateErr || !updatedRepo) {
      throw new Error("Failed to update existing repository record.");
    }

    // Clear old code chunks before re-embedding new ones
    await supabase.from("code_chunks").delete().eq("repo_id", existingRepo.id);

    return updatedRepo.id;
  }

  // Insert new repo
  const { data: newRepo, error: insertErr } = await supabase
    .from("repositories")
    .insert({
      user_id: userId,
      repo_url: details.repoUrl,
      name: details.name,
      last_commit_hash: details.lastCommitHash,
      file_count: details.fileCount,
    })
    .select("id")
    .single();

  if (insertErr || !newRepo) {
    throw new Error("Failed to register new repository in the database.");
  }

  return newRepo.id;
}

/**
 * Embeds code chunks and inserts them into the code_chunks table in batches.
 */
export async function processAndStoreCodeChunks(
  repoId: string,
  chunks: CodeChunk[],
  onProgress?: (progress: number) => void
) {
  const supabase = await createClient();
  const BATCH_SIZE = 50;
  
  let processedCount = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    // 1. Generate embeddings for the batch
    const texts = batch.map((c) => c.content);
    const vectors = await embedChunks(texts);
    
    // 2. Map back to Supabase payload
    // Note: pgvector expects an array of numbers, formatted nicely.
    // Supabase JS client handles number[] directly.
    const payload = batch.map((chunk, idx) => ({
      repo_id: repoId,
      file_path: chunk.filePath,
      content: chunk.content,
      embedding: vectors[idx],
      metadata: chunk.metadata,
    }));

    // 3. Insert into Supabase
    const { error: insertErr } = await supabase
      .from("code_chunks")
      .insert(payload);

    if (insertErr) {
      console.error("Failed to insert chunk batch into Supabase.", insertErr.message);
      throw new Error("Database insertion error during chunk processing.");
    }

    processedCount += batch.length;
    
    // Report progress
    if (onProgress) {
        // Calculate progress percentage, e.g. 45
        const currentProgress = Math.floor((processedCount / chunks.length) * 100);
        onProgress(currentProgress);
    }
  }
}
