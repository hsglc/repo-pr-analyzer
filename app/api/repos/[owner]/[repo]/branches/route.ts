import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { owner, repo } = await params;
  const userId = auth.uid;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
  }

  try {
    const token = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(token, owner, repo);

    const [branches, repoDetails] = await Promise.all([
      platform.listBranches(),
      platform.getRepoDetails(),
    ]);

    return NextResponse.json({
      branches,
      defaultBranch: repoDetails.defaultBranch,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      return NextResponse.json({ error: "Repo bulunamadı" }, { status: 404 });
    }
    if (status === 403) {
      return NextResponse.json(
        { error: "API istek limiti aşıldı. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }
    console.error("Branches API error:", err);
    return NextResponse.json(
      { error: "Branch'ler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
  });
}
