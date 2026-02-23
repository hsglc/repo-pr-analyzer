import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Octokit } from "@octokit/rest";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo } = await params;
  const userId = (session.user as { id: string }).id;
  const apiKeys = await findApiKeysByUserId(userId);

  if (!apiKeys?.githubToken) {
    return NextResponse.json({ error: "GitHub token bulunamadi" }, { status: 400 });
  }

  try {
    const token = decrypt(apiKeys.githubToken);
    const octokit = new Octokit({ auth: token });

    const { data: pulls } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      sort: "updated",
      per_page: 50,
    });

    const mapped = pulls.map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: {
        login: pr.user?.login ?? "unknown",
        avatarUrl: pr.user?.avatar_url ?? "",
      },
      labels: pr.labels.map((l) => ({
        name: typeof l === "string" ? l : l.name ?? "",
        color: typeof l === "string" ? "888888" : l.color ?? "888888",
      })),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "PR'lar yuklenirken hata olustu" },
      { status: 500 }
    );
  }
}
