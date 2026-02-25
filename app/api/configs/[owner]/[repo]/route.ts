import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId, upsertRepoConfig } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { resolveConfig } from "@/lib/config-resolver";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import { detectConfigFromTree } from "@/lib/auto-detect-config";

const FeatureMappingSchema = z.object({
  description: z.string(),
  paths: z.array(z.string()),
  relatedFeatures: z.array(z.string()).optional(),
});

const ImpactMapConfigSchema = z.object({
  features: z.record(FeatureMappingSchema),
  services: z.record(z.array(z.string())),
  pages: z.record(z.array(z.string())),
  ignorePatterns: z.array(z.string()),
});

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
    const githubToken = decrypt(apiKeys.githubToken);
    const { config, source } = await resolveConfig(owner, repo, githubToken, userId);

    return NextResponse.json({ config, source });
  } catch {
    return NextResponse.json({ error: "Config yüklenemedi" }, { status: 500 });
  }
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { owner, repo } = await params;
    const userId = auth.uid;
    const body = await request.json();

    const parsed = ImpactMapConfigSchema.safeParse(body.config);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz config formatı", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const repoFullName = `${owner}/${repo}`;
    await upsertRepoConfig(userId, repoFullName, JSON.stringify(parsed.data));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Config kaydedilemedi" }, { status: 500 });
  }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { owner, repo } = await params;
    const userId = auth.uid;
    const apiKeys = await findApiKeysByUserId(userId);

    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(githubToken, owner, repo);
    const tree = await platform.getRepoTree();
    const config = detectConfigFromTree(tree);

    const repoFullName = `${owner}/${repo}`;
    await upsertRepoConfig(userId, repoFullName, JSON.stringify(config));

    return NextResponse.json({ config, source: "auto-detected" });
  } catch (error) {
    console.error("Auto-detect config error:", error);
    return NextResponse.json({ error: "Otomatik tespit başarısız" }, { status: 500 });
  }
  });
}
