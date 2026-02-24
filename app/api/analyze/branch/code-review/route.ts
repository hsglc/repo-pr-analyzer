import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runBranchCodeReview } from "@/lib/analysis-service";

const BranchCodeReviewSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  baseBranch: z.string().min(1),
  headBranch: z.string().min(1),
  model: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const userId = auth.uid;
    const body = await request.json();
    const { owner, repo, baseBranch, headBranch, model } = BranchCodeReviewSchema.parse(body);

    if (baseBranch === headBranch) {
      return NextResponse.json(
        { error: "Aynı branch seçilemez. Lütfen farklı branch'ler seçin." },
        { status: 400 }
      );
    }

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);

    let aiApiKey: string;
    if (apiKeys.aiProvider === "openai") {
      if (!apiKeys.openaiApiKey) {
        return NextResponse.json({ error: "OpenAI API key bulunamadı" }, { status: 400 });
      }
      aiApiKey = decrypt(apiKeys.openaiApiKey);
    } else {
      if (!apiKeys.claudeApiKey) {
        return NextResponse.json({ error: "Claude API key bulunamadı" }, { status: 400 });
      }
      aiApiKey = decrypt(apiKeys.claudeApiKey);
    }

    const { codeReview, headSha } = await runBranchCodeReview({
      owner,
      repo,
      baseBranch,
      headBranch,
      githubToken,
      aiProvider: apiKeys.aiProvider,
      aiApiKey,
      userId,
      model,
    });

    return NextResponse.json({ codeReview, headSha });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      return NextResponse.json({ error: "Branch bulunamadı" }, { status: 404 });
    }
    if (status === 403) {
      return NextResponse.json(
        { error: "API istek limiti aşıldı. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }
    console.error("Branch code review error:", err);
    return NextResponse.json(
      { error: "Branch kod inceleme sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
