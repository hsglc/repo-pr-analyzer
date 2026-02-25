import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import { getBotOctokit } from "@/lib/github-app-auth";
import { ReportGenerator, COMMENT_MARKER } from "@/lib/core/generators/report-generator";
import type { AnalysisReport } from "@/lib/core/types";
import { ownerSchema, repoSchema } from "@/lib/validation";

const FeatureImpactSchema = z.object({
  name: z.string(),
  affectedFiles: z.array(z.string()),
  changeType: z.enum(["direct", "indirect"]),
  description: z.string(),
});

const ImpactResultSchema = z.object({
  features: z.array(FeatureImpactSchema),
  services: z.array(z.string()),
  pages: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string(),
});

const TestScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  feature: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  type: z.enum(["functional", "regression", "edge-case", "integration"]),
  steps: z.array(z.string()),
  expectedResult: z.string(),
});

const CodeReviewItemSchema = z.object({
  id: z.string(),
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(["critical", "warning", "info", "suggestion"]),
  category: z.enum(["bug", "security", "performance", "maintainability", "style"]),
  title: z.string(),
  description: z.string(),
  suggestion: z.string().optional(),
});

const AnalysisReportSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  timestamp: z.string(),
  impact: ImpactResultSchema,
  testScenarios: z.array(TestScenarioSchema),
  codeReview: z.array(CodeReviewItemSchema).default([]),
  stats: z.object({
    filesChanged: z.number(),
    additions: z.number(),
    deletions: z.number(),
    featuresAffected: z.number(),
  }),
});

const PostSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  prNumber: z.number().int().positive(),
  report: AnalysisReportSchema,
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
    const { owner, repo, prNumber, report } = PostSchema.parse(body);

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadı" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const botOctokit = await getBotOctokit(owner, repo).catch(() => null);
    const platform = new GitHubPlatform(githubToken, owner, repo, botOctokit);
    const reportGen = new ReportGenerator();
    const markdown = reportGen.generate(report as AnalysisReport);

    await platform.upsertComment(prNumber, markdown, COMMENT_MARKER);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz rapor formatı" }, { status: 400 });
    }
    console.error("Post to PR error:", error);
    return NextResponse.json({ error: "Yorum yazılamadı" }, { status: 500 });
  }
  });
}
