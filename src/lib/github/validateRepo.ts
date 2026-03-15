import { Octokit } from "octokit";

export interface RepoValidationResult {
  isValid: boolean;
  message?: string;
  repoDetails?: {
    sizeKb: number;
    fileCount: number;
    defaultBranch: string;
  };
}

/**
 * Validates a GitHub repository against size and file count limits.
 * Maximums: 5MB size or 100 files.
 * @param owner The GitHub repository owner
 * @param repo The GitHub repository name
 * @param token Optional GitHub token for increased rate limits or private repos
 * @returns Validation result with humor.
 */
export async function validateRepo(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoValidationResult> {
  const octokit = new Octokit({ auth: token });

  try {
    // 1. Fetch basic repo details to get size and default branch
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // repoData.size is in KB
    const sizeInMB = repoData.size / 1024;

    if (sizeInMB > 5) {
      return {
        isValid: false,
        message: "Whoa, save some bits for the rest of us. Try a smaller repo (Max 5MB) for this demo. We're running on a startup budget here.",
      };
    }

    // 2. Fetch the tree recursively to get file count
    // We use the default branch as the tree sha
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch,
      recursive: "1",
    });

    // Count only blobs (files), ignoring trees (directories)
    const files = treeData.tree.filter((item) => item.type === "blob");
    const fileCount = files.length;

    if (fileCount > 100) {
      return {
        isValid: false,
        message: `Holy boilerplate! 100 files maximum. Your repo has ${fileCount}. Whoa, save some bits for the rest of us. Try a smaller repo for this demo.`,
      };
    }

    // Passed constraints
    return {
      isValid: true,
      repoDetails: {
        sizeKb: repoData.size,
        fileCount,
        defaultBranch: repoData.default_branch,
      },
    };
  } catch (error: any) {
    console.error("Error validating repo:", error);

    // Handle 404s specifically
    if (error.status === 404) {
      return {
        isValid: false,
        message: "404 Repo Not Found. Are you sure you didn't imagine writing that code? Or maybe it's private and you need to link your account.",
      };
    }

    return {
      isValid: false,
      message: "Failed to fetch repository. GitHub might be judging our API requests. Try again later.",
    };
  }
}
