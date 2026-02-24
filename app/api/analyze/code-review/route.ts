import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runCodeReview, AnalysisError } from "@/lib/analysis-service";

const CodeReviewSchema = z.object({
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
    const { owner, repo, prNumber, model } = CodeReviewSchema.parse(body);

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

    const { codeReview, headSha } = await runCodeReview({
      owner,
      repo,
      prNumber,
      githubToken,
      aiProvider: apiKeys.aiProvider,
      aiApiKey,
      userId,
      model,
    });

    return NextResponse.json({ codeReview, commitSha: headSha });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof AnalysisError) {
      console.error(`Code review error [${error.step}]:`, error.cause || error.message);
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Code review error:", error);
    return NextResponse.json({ error: "Kod inceleme sırasında hata oluştu" }, { status: 500 });
  }
}
