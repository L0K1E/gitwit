import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

let embeddings: OpenAIEmbeddings | GoogleGenerativeAIEmbeddings | null = null;

/**
 * Initializes and returns the configured embedding model based on environment variables.
 */
export function getEmbeddings() {
  if (embeddings) {
    return embeddings;
  }

  // We default to OpenAI for 1536 dim vectors as per schema.
  if (process.env.OPENAI_API_KEY) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-ada-002", // standard 1536
    });
    return embeddings;
  }

  if (process.env.GOOGLE_API_KEY) {
    // Note: Gemini embeddings usually output 768 dimensions.
    // Ensure the database schema matches this if switching!
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: "embedding-001",
    });
    return embeddings;
  }

  throw new Error("No embedding provider API keys found. Please define OPENAI_API_KEY or GOOGLE_API_KEY in your environment.");
}

/**
 * Embeds a batch of text chunks.
 */
export async function embedChunks(texts: string[]): Promise<number[][]> {
  const model = getEmbeddings();
  
  try {
    const vectors = await model.embedDocuments(texts);
    return vectors;
  } catch (error) {
    // Ensure we don't leak API keys in logs
    console.error("Embedding generation failed.");
    throw new Error("Failed to generate vector embeddings.");
  }
}
