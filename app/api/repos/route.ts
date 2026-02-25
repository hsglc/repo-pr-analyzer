import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json(
      { error: "GitHub token bulunamadı. Lütfen ayarlardan ekleyin." },
      { status: 400 }
    );
  }

  try {
    const token = decrypt(apiKeys.githubToken);
    const octokit = new Octokit({ auth: token });

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });

    const mapped = repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      description: r.description,
      language: r.language,
      updatedAt: r.updated_at,
      isPrivate: r.private,
      stargazersCount: r.stargazers_count,
      forksCount: r.forks_count,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "Repolar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
  });
}
