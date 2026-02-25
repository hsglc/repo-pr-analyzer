import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId, getLatestAnalysis, getLatestCodeReview } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import { validateOwnerRepoPRParams } from "@/lib/validation";

export async function GET(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const { searchParams } = new URL(request.url);
  const result = validateOwnerRepoPRParams(searchParams);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { owner, repo, prNumber: prNum } = result.data;

  try {
    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(githubToken, owner, repo);

    // Fetch latest analysis, latest code review, and current HEAD SHA in parallel
    // getPRHeadSha may fail (rate limit, network etc.) - handle gracefully
    let latestAnalysis: Awaited<ReturnType<typeof getLatestAnalysis>> = null;
    let latestCodeReview: Awaited<ReturnType<typeof getLatestCodeReview>> = null;
    let currentHeadSha = "";

    try {
      [latestAnalysis, latestCodeReview, currentHeadSha] = await Promise.all([
        getLatestAnalysis(userId, `${owner}/${repo}`, prNum),
        getLatestCodeReview(userId, `${owner}/${repo}`, prNum),
        platform.getPRHeadSha(prNum),
      ]);
    } catch (innerError) {
      console.error("Status: GitHub/Firebase hatası:", innerError);
      // Try just the history without SHA comparison
      try {
        [latestAnalysis, latestCodeReview] = await Promise.all([
          getLatestAnalysis(userId, `${owner}/${repo}`, prNum),
          getLatestCodeReview(userId, `${owner}/${repo}`, prNum),
        ]);
      } catch {
        // No history available either
      }
    }

    // Build lastCodeReview payload if available
    const lastCodeReview = latestCodeReview
      ? {
          id: latestCodeReview.id,
          commitSha: latestCodeReview.commitSha,
          createdAt: latestCodeReview.createdAt,
          prTitle: latestCodeReview.prTitle,
          codeReview: JSON.parse(latestCodeReview.codeReview),
        }
      : null;

    if (!latestAnalysis) {
      return NextResponse.json({
        hasHistory: false,
        needsReanalysis: false,
        currentHeadSha,
        lastCodeReview,
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
      lastCodeReview,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Durum kontrolü başarısız" }, { status: 500 });
  }
  });
}
