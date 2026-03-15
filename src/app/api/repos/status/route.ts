import { NextRequest, NextResponse } from "next/server";
import { getIngestionStatus } from "@/lib/ingestion";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repoUrl");

  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  const status = getIngestionStatus(repoUrl);

  return NextResponse.json({ status });
}
