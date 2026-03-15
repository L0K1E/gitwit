import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguage } from "@langchain/textsplitters";
import { GithubFile } from "./github";

export interface CodeChunk {
  filePath: string;
  content: string;
  metadata: Record<string, any>;
}

// Map standard extensions to LangChain SupportedTextSplitterLanguage
const EXTENSION_LANGUAGE_MAP: Record<string, SupportedTextSplitterLanguage> = {
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

/**
 * Gets the relevant LangChain language enum from a file path.
 */
function getLanguageFromPath(filePath: string): SupportedTextSplitterLanguage | undefined {
  const extension = Object.keys(EXTENSION_LANGUAGE_MAP).find((ext) => filePath.endsWith(ext));
  return extension ? EXTENSION_LANGUAGE_MAP[extension] : undefined;
}

/**
 * Splits a GithubFile into manageable chunks, utilizing Language-specific rules if possible.
 */
export async function chunkFile(file: GithubFile): Promise<CodeChunk[]> {
  const language = getLanguageFromPath(file.path);
  
  let splitter: RecursiveCharacterTextSplitter;

  const chunkSize = 1000;
  const chunkOverlap = 200;

  if (language) {
    // If it's a strongly typed language known by LangChain, use its specific splitter
    splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
      chunkSize,
      chunkOverlap,
    });
  } else {
    // Fallback splitter
    splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
  }

  const documents = await splitter.createDocuments(
    [file.content],
    [{ source: file.path }]
  );

  return documents.map((doc, index) => ({
    filePath: file.path,
    content: doc.pageContent,
    metadata: {
      ...doc.metadata,
      chunkIndex: index,
    },
  }));
}

/**
 * Helper to chunk an entire array of files.
 */
export async function chunkFiles(files: GithubFile[]): Promise<CodeChunk[]> {
  const allChunks: CodeChunk[] = [];
  
  for (const file of files) {
    const fileChunks = await chunkFile(file);
    allChunks.push(...fileChunks);
  }
  
  return allChunks;
}
