import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRepoAnalysisSummary } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
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
