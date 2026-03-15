import { NextRequest, NextResponse } from "next/server";
import { processRepository, getIngestionStatus } from "@/lib/ingestion";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userResp, error: authError } = await supabase.auth.getUser();

    if (authError || !userResp?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { repoUrl, githubToken } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required" }, { status: 400 });
    }

    const currentStatus = getIngestionStatus(repoUrl);
    
    // Don't start another job if one is already running
    if (currentStatus.status === "fetching" || currentStatus.status === "chunking" || currentStatus.status === "embedding") {
      return NextResponse.json({ 
        message: "Ingestion is already in progress.",
        status: currentStatus 
      });
    }

    // Fire and forget: Do not await this, let it run in the background
    // Note: Vercel may kill this on serverless. It's best to configure maxDuration or use Edge/Upstash.
    processRepository(repoUrl, githubToken).catch((error) => {
        console.error("Background ingestion error:", error);
    });

    return NextResponse.json({ 
      message: "Ingestion started successfully.",
      status: getIngestionStatus(repoUrl)
    }, { status: 202 });

  } catch (error: any) {
    console.error("API POST Ingest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userResp, error: authError } = await supabase.auth.getUser();

    if (authError || !userResp?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const repoUrl = url.searchParams.get("repoUrl");

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl query parameter is required" }, { status: 400 });
    }

    const status = getIngestionStatus(repoUrl);
    return NextResponse.json({ status });
  } catch (error: any) {
    console.error("API GET Ingest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
