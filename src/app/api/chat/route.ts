import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { searchCodebase } from "@/lib/rag/retriever";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userResp, error: authError } = await supabase.auth.getUser();

    if (authError || !userResp?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, repoId } = await req.json();

    if (!repoId) {
      return NextResponse.json({ error: "No repository selected." }, { status: 400 });
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage || latestMessage.role !== "user") {
      return NextResponse.json({ error: "Invalid message sequence." }, { status: 400 });
    }

    // 1. Semantic Search: Fetch relevant code chunks
    const matches = await searchCodebase(latestMessage.content, repoId, 7);

    // 2. Assemble Context
    let contextStr = "";
    if (matches.length > 0) {
      contextStr = "Here are some relevant code snippets from the codebase:\n\n";
      matches.forEach((match, idx) => {
        contextStr += `--- Snippet ${idx + 1} (File: ${match.file_path}) ---\n`;
        contextStr += `${match.content}\n\n`;
      });
    } else {
      contextStr = "No relevant code snippets were found in the database. Rely on general knowledge or state that you can't see the code.";
    }

    // 3. Prepare System Prompt (GitWit Persona)
    const systemPrompt = `You are GitWit, a brilliant but slightly sarcastic codebase expert. Your job is to explain code based ONLY on the provided snippets.
Be witty, concise, and helpful. 
If the answer isn't in the snippets, say something like: "My crystal ball is foggy on this one. It's not in the code you gave me."

${contextStr}
`;

    // 4. Select LLM provider
    let model;
    if (process.env.OPENAI_API_KEY) {
      model = openai("gpt-4-turbo"); // or gpt-3.5-turbo
    } else if (process.env.GOOGLE_API_KEY) {
      model = google("models/gemini-1.5-pro-latest");
    } else {
      throw new Error("No language model API key configured.");
    }

    // 5. Call LLM and Stream Output
    const result = streamText({
      model,
      system: systemPrompt,
      messages, // This array already includes the user's latest query
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
