import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { owner, repo } = await params;
  const userId = (session.user as { id: string }).id;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
  }

  try {
    const token = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(token, owner, repo);
    const details = await platform.getRepoDetails();
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ error: "Repo detayları alınamadı" }, { status: 500 });
  }
}
