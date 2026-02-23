import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { findApiKeysByUserId } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import { ReportGenerator, COMMENT_MARKER } from "@/lib/core/generators/report-generator";
import type { AnalysisReport } from "@/lib/core/types";

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

const AnalysisReportSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  timestamp: z.string(),
  impact: ImpactResultSchema,
  testScenarios: z.array(TestScenarioSchema),
  stats: z.object({
    filesChanged: z.number(),
    additions: z.number(),
    deletions: z.number(),
    featuresAffected: z.number(),
  }),
});

const PostSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
  report: AnalysisReportSchema,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { owner, repo, prNumber, report } = PostSchema.parse(body);

    const apiKeys = await findApiKeysByUserId(userId);
    if (!apiKeys?.githubToken) {
      return NextResponse.json({ error: "GitHub token bulunamadi" }, { status: 400 });
    }

    const githubToken = decrypt(apiKeys.githubToken);
    const platform = new GitHubPlatform(githubToken, owner, repo);
    const reportGen = new ReportGenerator();
    const markdown = reportGen.generate(report as AnalysisReport);

    await platform.upsertComment(prNumber, markdown, COMMENT_MARKER);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz rapor formati" }, { status: 400 });
    }
    console.error("Post to PR error:", error);
    return NextResponse.json({ error: "Comment yazilamadi" }, { status: 500 });
  }
}
