import { fetchWhitelistedFiles } from "./github";
import { chunkFiles } from "./chunker";
import { upsertRepository, processAndStoreCodeChunks } from "./supabase";

export interface IngestionStatus {
  status: "idle" | "fetching" | "chunking" | "embedding" | "completed" | "error";
  progress?: number;
  message?: string;
  error?: string;
}

// In-memory status tracker for demo purposes (serverless resets this, but good enough for local/demo)
const jobStatuses = new Map<string, IngestionStatus>();

export function getIngestionStatus(repoUrl: string): IngestionStatus {
  return jobStatuses.get(repoUrl) || { status: "idle", message: "Not started" };
}

/**
 * Parses GitHub URL into owner and repo name.
 */
function parseGithubUrl(url: string): { owner: string; repo: string } {
  // Regex to handle github.com/owner/repo without strictly needing https
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL provided.");
  }
  return { owner: match[1], repo: match[2].replace(".git", "") };
}

/**
 * The main pipeline to ingest a repository into the vector database.
 * Designed to execute asynchronously in the background.
 */
export async function processRepository(repoUrl: string, githubToken?: string) {
  try {
    const { owner, repo } = parseGithubUrl(repoUrl);
    
    // 1. Fetching
    jobStatuses.set(repoUrl, { status: "fetching", message: "Fetching files... (Throwing away the trash)" });
    const { files, lastCommitHash } = await fetchWhitelistedFiles(owner, repo, githubToken);

    if (files.length === 0) {
      throw new Error("No processable code files found in the repository.");
    }

    // 2. Database Repo Sync (Upsert)
    const repoId = await upsertRepository({
      repoUrl,
      name: `${owner}/${repo}`,
      lastCommitHash,
      fileCount: files.length,
    });

    // 3. Chunking
    jobStatuses.set(repoUrl, { status: "chunking", message: "Slicing and dicing your code into chunks..." });
    const chunks = await chunkFiles(files);

    // 4. Vectorization and DB Upsert
    jobStatuses.set(repoUrl, { 
      status: "embedding", 
      progress: 0, 
      message: "Reading... 0% (Finding where you hid that bug)" 
    });

    await processAndStoreCodeChunks(repoId, chunks, (progress) => {
      jobStatuses.set(repoUrl, { 
        status: "embedding", 
        progress, 
        message: `Reading... ${progress}% (Finding where you hid that bug)` 
      });
    });

    // Done
    jobStatuses.set(repoUrl, { status: "completed", message: "Successfully ingested and vectorized repository!" });

  } catch (error: any) {
    console.error(`Ingestion failed for ${repoUrl}:`, error.message);
    // Don't leak stack traces or keys
    jobStatuses.set(repoUrl, { status: "error", error: error.message || "An unexpected error occurred during ingestion." });
  }
}
