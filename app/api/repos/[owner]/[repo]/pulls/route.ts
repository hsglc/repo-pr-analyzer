import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

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
    const octokit = new Octokit({ auth: token });

    // Read state query parameter
    const url = new URL(request.url);
    const stateParam = url.searchParams.get("state") || "open";
    const state = (["open", "closed", "all"].includes(stateParam) ? stateParam : "open") as "open" | "closed" | "all";

    const { data: pulls } = await octokit.pulls.list({
      owner,
      repo,
      state,
      sort: "updated",
      per_page: 50,
    });

    const mapped = pulls.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged_at !== null,
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
    console.error("Pulls API error:", err);
    return NextResponse.json(
      { error: "PR'lar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
  });
}
