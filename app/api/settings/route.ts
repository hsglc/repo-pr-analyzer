import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId, upsertApiKeys } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const apiKeys = await findApiKeysByUserId(userId);

  return NextResponse.json({
    hasGithubToken: !!apiKeys?.githubToken,
    hasClaudeApiKey: !!apiKeys?.claudeApiKey,
    hasOpenaiApiKey: !!apiKeys?.openaiApiKey,
    aiProvider: apiKeys?.aiProvider ?? "claude",
  });
  });
}

const UpdateSchema = z.object({
  githubToken: z.string().min(1, "GitHub token zorunlu").max(500, "Token çok uzun"),
  claudeApiKey: z.string().max(500, "API key çok uzun").optional(),
  openaiApiKey: z.string().max(500, "API key çok uzun").optional(),
  aiProvider: z.enum(["claude", "openai"]).default("claude"),
});

export async function PUT(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const userId = auth.uid;
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
    console.error("Settings PUT error:", error);
    const message = error instanceof Error ? error.message : "Ayarlar kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}
