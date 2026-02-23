import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId, upsertApiKeys } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const apiKeys = await findApiKeysByUserId(userId);

  return NextResponse.json({
    hasGithubToken: !!apiKeys?.githubToken,
    hasClaudeApiKey: !!apiKeys?.claudeApiKey,
    hasOpenaiApiKey: !!apiKeys?.openaiApiKey,
    aiProvider: apiKeys?.aiProvider ?? "claude",
  });
}

const UpdateSchema = z.object({
  githubToken: z.string().min(1, "GitHub token gerekli").max(500, "Token cok uzun"),
  claudeApiKey: z.string().max(500, "API key cok uzun").optional(),
  openaiApiKey: z.string().max(500, "API key cok uzun").optional(),
  aiProvider: z.enum(["claude", "openai"]).default("claude"),
});

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const data = UpdateSchema.parse(body);

    await upsertApiKeys(userId, {
      githubToken: encrypt(data.githubToken),
      claudeApiKey: data.claudeApiKey ? encrypt(data.claudeApiKey) : null,
      openaiApiKey: data.openaiApiKey ? encrypt(data.openaiApiKey) : null,
      aiProvider: data.aiProvider,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ayarlar kaydedilemedi" }, { status: 500 });
  }
}
