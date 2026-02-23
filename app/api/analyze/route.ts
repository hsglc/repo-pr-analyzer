import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId, saveAnalysis } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runAnalysis } from "@/lib/analysis-service";

const AnalyzeSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { owner, repo, prNumber } = AnalyzeSchema.parse(body);

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadi" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);

    let aiApiKey: string;
    if (apiKeys.aiProvider === "openai") {
      if (!apiKeys.openaiApiKey) {
        return NextResponse.json({ error: "OpenAI API key bulunamadi" }, { status: 400 });
      }
      aiApiKey = decrypt(apiKeys.openaiApiKey);
    } else {
      if (!apiKeys.claudeApiKey) {
        return NextResponse.json({ error: "Claude API key bulunamadi" }, { status: 400 });
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
    });

    // Save to Firebase
    await saveAnalysis(userId, `${owner}/${repo}`, prNumber, {
      report: JSON.stringify(report),
      commitSha: headSha,
      prTitle: report.prTitle,
      createdAt: new Date().toISOString(),
      configSource,
    });

    return NextResponse.json({ ...report, commitSha: headSha });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analiz sirasinda hata olustu" }, { status: 500 });
  }
}
