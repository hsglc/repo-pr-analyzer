import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { getRepoAnalysisSummary } from "@/lib/db";
import { validateOwnerRepoParams } from "@/lib/validation";

export async function GET(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const { searchParams } = new URL(request.url);
  const result = validateOwnerRepoParams(searchParams);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { owner, repo } = result.data;

  try {
    const summaries = await getRepoAnalysisSummary(userId, `${owner}/${repo}`);
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Repo summary error:", error);
    return NextResponse.json({ error: "Özet yüklenemedi" }, { status: 500 });
  }
  });
}
