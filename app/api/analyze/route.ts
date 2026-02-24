import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth-server";
import { findApiKeysByUserId, saveAnalysis } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runAnalysis, AnalysisError } from "@/lib/analysis-service";

const AnalyzeSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
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
    const { owner, repo, prNumber, model } = AnalyzeSchema.parse(body);

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

    const { report, configSource, headSha } = await runAnalysis({
      owner,
      repo,
      prNumber,
      githubToken,
      aiProvider: apiKeys.aiProvider,
      aiApiKey,
      userId,
      model,
    });

    // Save to Firebase (non-critical - don't let save failure break the response)
    try {
      await saveAnalysis(userId, `${owner}/${repo}`, prNumber, {
        report: JSON.stringify(report),
        commitSha: headSha,
        prTitle: report.prTitle,
        createdAt: new Date().toISOString(),
        configSource,
      });
    } catch (saveError) {
      console.error("Analiz kaydedilemedi (Firebase):", saveError);
    }

    return NextResponse.json({ ...report, commitSha: headSha });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof AnalysisError) {
      console.error(`Analyze error [${error.step}]:`, error.cause || error.message);
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analiz sırasında hata oluştu" }, { status: 500 });
  }
}
