import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { owner, repo, number } = await params;
  const prNumber = parseInt(number, 10);
  if (isNaN(prNumber)) {
    return NextResponse.json({ error: "Geçersiz PR numarası" }, { status: 400 });
  }

  const userId = auth.uid;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
  }

  try {
    const token = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(token, owner, repo);
    const diff = await platform.getDiff(prNumber);
    return NextResponse.json({ diff });
  } catch {
    return NextResponse.json({ error: "Diff alınamadı" }, { status: 500 });
  }
  });
}
