import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { runCodeReview } from "@/lib/analysis-service";

const CodeReviewSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { owner, repo, prNumber } = CodeReviewSchema.parse(body);

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
    });

    return NextResponse.json({ codeReview, commitSha: headSha });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Code review error:", error);
    return NextResponse.json({ error: "Kod inceleme sırasında hata oluştu" }, { status: 500 });
  }
}
