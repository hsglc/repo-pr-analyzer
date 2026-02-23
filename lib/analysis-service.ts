import { DiffParser } from "@/lib/core/parsers/diff-parser";
import { ImpactAnalyzer } from "@/lib/core/analyzers/impact-analyzer";
import { TestGenerator } from "@/lib/core/generators/test-generator";
import { CodeReviewGenerator } from "@/lib/core/generators/code-review-generator";
import { ClaudeProvider } from "@/lib/core/providers/claude-provider";
import { OpenAIProvider } from "@/lib/core/providers/openai-provider";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import type { AIProvider } from "@/lib/core/providers/ai-provider";
import type { AnalysisReport, CodeReviewItem } from "@/lib/core/types";
import { resolveConfig } from "@/lib/config-resolver";

export interface AnalysisParams {
  owner: string;
  repo: string;
  prNumber: number;
  githubToken: string;
  aiProvider: string;
  aiApiKey: string;
  userId: string;
}

export interface AnalysisResult {
  report: AnalysisReport;
  configSource: string;
  headSha: string;
}

export interface CodeReviewResult {
  codeReview: CodeReviewItem[];
  headSha: string;
}

export async function runAnalysis(params: AnalysisParams): Promise<AnalysisResult> {
  const { owner, repo, prNumber, githubToken, aiProvider, aiApiKey, userId } = params;

  // 1. Resolve config
  const { config: impactMapConfig, source: configSource } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff + PR info
  const platform = new GitHubPlatform(githubToken, owner, repo);
  const [rawDiff, prInfo] = await Promise.all([
    platform.getDiff(prNumber),
    platform.getPRInfo(prNumber),
  ]);
  const { title: prTitle, headSha } = prInfo;

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. AI test generation
  const provider = createAIProvider(aiProvider, aiApiKey);
  const testGen = new TestGenerator(provider);
  const testScenarios = await testGen.generate(impact, parsedFiles, 15);

  // 6. Build report
  const report: AnalysisReport = {
    prNumber,
    prTitle,
    timestamp: new Date().toISOString(),
    impact,
    testScenarios,
    codeReview: [],
    stats: {
      filesChanged: parsedFiles.length,
      additions: parsedFiles.reduce((sum, f) => sum + f.additions, 0),
      deletions: parsedFiles.reduce((sum, f) => sum + f.deletions, 0),
      featuresAffected: impact.features.length,
    },
  };

  return { report, configSource, headSha };
}

export async function runCodeReview(params: AnalysisParams): Promise<CodeReviewResult> {
  const { owner, repo, prNumber, githubToken, aiProvider, aiApiKey, userId } = params;

  // 1. Resolve config
  const { config: impactMapConfig } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff + PR info
  const platform = new GitHubPlatform(githubToken, owner, repo);
  const [rawDiff, prInfo] = await Promise.all([
    platform.getDiff(prNumber),
    platform.getPRInfo(prNumber),
  ]);
  const { headSha } = prInfo;

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. AI code review
  const provider = createAIProvider(aiProvider, aiApiKey);
  const reviewGen = new CodeReviewGenerator(provider);
  const codeReview = await reviewGen.generate(impact, parsedFiles, 20);

  return { codeReview, headSha };
}

function createAIProvider(provider: string, apiKey: string): AIProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "claude":
    default:
      return new ClaudeProvider(apiKey);
  }
}
