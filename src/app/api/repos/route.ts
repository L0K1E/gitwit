import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userResp, error: authError } = await supabase.auth.getUser();

    if (authError || !userResp?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userResp.user.id;

    // Fetch all repositories for the authenticated user
    const { data: repos, error: fetchErr } = await supabase
      .from("repositories")
      .select("id, name, repo_url, last_commit_hash, file_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchErr) {
      console.error("Failed to fetch repositories:", fetchErr);
      return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }

    return NextResponse.json({ repositories: repos || [] });
  } catch (error: any) {
    console.error("API GET /repos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
