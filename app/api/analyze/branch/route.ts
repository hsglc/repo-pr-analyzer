import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId, saveBranchAnalysis } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runBranchAnalysis, AnalysisError } from "@/lib/analysis-service";
import { ownerSchema, repoSchema, branchSchema, modelSchema } from "@/lib/validation";

const BranchAnalyzeSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  baseBranch: branchSchema,
  headBranch: branchSchema,
  model: modelSchema,
});

export async function POST(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const userId = auth.uid;
    const body = await request.json();
    const { owner, repo, baseBranch, headBranch, model } = BranchAnalyzeSchema.parse(body);

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

    const { report, configSource, headSha } = await runBranchAnalysis({
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

    // Save to Firebase (non-critical)
    try {
      await saveBranchAnalysis(userId, `${owner}/${repo}`, headBranch, baseBranch, {
        report: JSON.stringify(report),
        headSha,
        title: report.prTitle,
        baseBranch,
        headBranch,
        createdAt: new Date().toISOString(),
        configSource,
      });
    } catch (saveError) {
      console.error("Branch analizi kaydedilemedi (Firebase):", saveError);
    }

    return NextResponse.json({ ...report, headSha });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    if (err instanceof AnalysisError) {
      console.error(`Branch analyze error [${err.step}]:`, err.cause || err.message);
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Branch analyze error:", err);
    return NextResponse.json(
      { error: "Branch analizi sırasında hata oluştu" },
      { status: 500 }
    );
  }
  });
}
