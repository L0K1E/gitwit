import { Octokit } from "octokit";

// Whitelist of allowed extensions
const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];

export interface GithubFile {
  path: string;
  content: string;
}

/**
 * Fetches all whitelisted files recursively from a repository.
 * Enforces limits: Max 100 files, Max 5MB.
 */
export async function fetchWhitelistedFiles(
  owner: string,
  repo: string,
  token?: string
): Promise<{ files: GithubFile[]; lastCommitHash: string; message?: string }> {
  const octokit = new Octokit({ auth: token });

  // 1. Check size limit
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  });

  const sizeInMB = repoData.size / 1024;
  if (sizeInMB > 5) {
    throw new Error("Whoa! This repo is too thick for my free-tier diet. Keep it under 5MB, champ.");
  }

  // 2. Fetch the tree recursively
  const defaultBranch = repoData.default_branch;
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "1",
  });

  // Get the latest commit hash for tracking
  const { data: commits } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: defaultBranch,
    per_page: 1,
  });
  const lastCommitHash = commits[0].sha;

  // Filter for blobs (files)
  const allFiles = treeData.tree.filter((item) => item.type === "blob");
  const fileCount = allFiles.length;

  if (fileCount > 100) {
    throw new Error("Whoa! This repo is too thick for my free-tier diet. Keep it under 100 files, champ.");
  }

  // Debug joke: Throwing away the trash...
  console.log("Throwing away the trash... (bye-bye .env and .gitignore).");

  // Filter whitelisted extensions
  const whitelistedItems = allFiles.filter((item) => {
    if (!item.path) return false;
    return ALLOWED_EXTENSIONS.some((ext) => item.path!.endsWith(ext));
  });

  const filesWithContent: GithubFile[] = [];

  // 3. Fetch file content for whitelisted items
  for (const item of whitelistedItems) {
    try {
      if (!item.sha || !item.path) continue;
      
      const { data: blobData } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: item.sha,
      });

      // Data is base64 encoded
      const content = Buffer.from(blobData.content, "base64").toString("utf-8");
      filesWithContent.push({
        path: item.path,
        content,
      });
    } catch (error) {
      console.warn(`Failed to fetch blob for ${item.path}:`, error);
    }
  }

  return { files: filesWithContent, lastCommitHash };
}
