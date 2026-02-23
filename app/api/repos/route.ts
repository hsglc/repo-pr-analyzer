import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Octokit } from "@octokit/rest";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json(
      { error: "GitHub token bulunamadi. Lutfen ayarlardan ekleyin." },
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
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "Repolar yuklenirken hata olustu" },
      { status: 500 }
    );
  }
}
