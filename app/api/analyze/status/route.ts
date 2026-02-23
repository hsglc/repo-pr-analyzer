import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId, getLatestAnalysis } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("prNumber");

  if (!owner || !repo || !prNumber) {
    return NextResponse.json({ error: "owner, repo ve prNumber gerekli" }, { status: 400 });
  }

  try {
    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(githubToken, owner, repo);
    const prNum = parseInt(prNumber, 10);

    // Fetch latest analysis and current HEAD SHA in parallel
    // getPRHeadSha may fail (rate limit, network etc.) - handle gracefully
    let latestAnalysis: Awaited<ReturnType<typeof getLatestAnalysis>> = null;
    let currentHeadSha = "";

    try {
      [latestAnalysis, currentHeadSha] = await Promise.all([
        getLatestAnalysis(userId, `${owner}/${repo}`, prNum),
        platform.getPRHeadSha(prNum),
      ]);
    } catch (innerError) {
      console.error("Status: GitHub/Firebase hatası:", innerError);
      // Try just the analysis history without SHA comparison
      try {
        latestAnalysis = await getLatestAnalysis(userId, `${owner}/${repo}`, prNum);
      } catch {
        // No history available either
      }
    }

    if (!latestAnalysis) {
      return NextResponse.json({
        hasHistory: false,
        needsReanalysis: false,
        currentHeadSha,
      });
    }

    // If we couldn't get currentHeadSha, assume reanalysis is needed
    const needsReanalysis = !currentHeadSha || latestAnalysis.commitSha !== currentHeadSha;

    return NextResponse.json({
      hasHistory: true,
      needsReanalysis,
      currentHeadSha,
      lastAnalysis: {
        id: latestAnalysis.id,
        commitSha: latestAnalysis.commitSha,
        createdAt: latestAnalysis.createdAt,
        prTitle: latestAnalysis.prTitle,
        report: JSON.parse(latestAnalysis.report),
      },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Durum kontrolü başarısız" }, { status: 500 });
  }
}
