import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-server";
import { getRepoAnalysisSummary } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner ve repo gerekli" }, { status: 400 });
  }

  try {
    const summaries = await getRepoAnalysisSummary(userId, `${owner}/${repo}`);
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Repo summary error:", error);
    return NextResponse.json({ error: "Özet yüklenemedi" }, { status: 500 });
  }
}
