import { DiffParser } from "@/lib/core/parsers/diff-parser";
import { ImpactAnalyzer } from "@/lib/core/analyzers/impact-analyzer";
import { TestGenerator } from "@/lib/core/generators/test-generator";
import { CodeReviewGenerator } from "@/lib/core/generators/code-review-generator";
import { ClaudeProvider } from "@/lib/core/providers/claude-provider";
import { OpenAIProvider } from "@/lib/core/providers/openai-provider";
import { GitHubPlatform } from "@/lib/core/platforms/github-platform";
import type { AIProvider } from "@/lib/core/providers/ai-provider";
import type { AnalysisReport, CodeReviewItem, ParsedFile } from "@/lib/core/types";
import { resolveConfig } from "@/lib/config-resolver";
import { buildCodebaseIndex } from "@/lib/core/codebase-indexer";
import type { CodebaseIndex } from "@/lib/core/codebase-indexer";
import { retrieveContext } from "@/lib/core/context-retriever";
import { getCodebaseIndex, saveCodebaseIndex } from "@/lib/db";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export class AnalysisError extends Error {
  public readonly statusCode: number;
  public readonly step: string;
  public readonly cause?: unknown;

  constructor(message: string, statusCode: number, step: string, cause?: unknown) {
    super(message);
    this.name = "AnalysisError";
    this.statusCode = statusCode;
    this.step = step;
    this.cause = cause;
  }
}

function handleGitHubError(err: unknown, context: string): never {
  const status = (err as { status?: number })?.status;
  if (status === 404) {
    throw new AnalysisError(
      `${context} bulunamadı`,
      404,
      "github",
      err
    );
  }
  if (status === 401) {
    throw new AnalysisError(
      "GitHub token geçersiz veya süresi dolmuş",
      401,
      "github",
      err
    );
  }
  if (status === 403) {
    throw new AnalysisError(
      "GitHub API istek limiti aşıldı. Lütfen daha sonra tekrar deneyin.",
      429,
      "github",
      err
    );
  }
  throw new AnalysisError(
    `GitHub API erişim hatası: ${(err as Error)?.message || "Bilinmeyen hata"}`,
    502,
    "github",
    err
  );
}

function isOverloadedError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError && err.status === 529) return true;
  if (err instanceof OpenAI.APIError && err.status === 529) return true;
  return false;
}

function handleAIError(err: unknown): never {
  // 529 Overloaded — özel handling (retry'lar tükendi)
  if (isOverloadedError(err)) {
    throw new AnalysisError(
      "AI servisi şu anda aşırı yüklü. Lütfen birkaç dakika bekleyip tekrar deneyin.",
      503,
      "ai-overloaded",
      err
    );
  }

  // Anthropic SDK errors
  if (err instanceof Anthropic.AuthenticationError) {
    throw new AnalysisError("Claude API anahtarı geçersiz", 400, "ai", err);
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new AnalysisError("Claude API istek limiti aşıldı", 429, "ai", err);
  }
  if (err instanceof Anthropic.APIError) {
    throw new AnalysisError(`Claude API hatası: ${err.message}`, 502, "ai", err);
  }

  // OpenAI SDK errors
  if (err instanceof OpenAI.AuthenticationError) {
    throw new AnalysisError("OpenAI API anahtarı geçersiz", 400, "ai", err);
  }
  if (err instanceof OpenAI.RateLimitError) {
    throw new AnalysisError("OpenAI API istek limiti aşıldı", 429, "ai", err);
  }
  if (err instanceof OpenAI.APIError) {
    throw new AnalysisError(`OpenAI API hatası: ${err.message}`, 502, "ai", err);
  }

  // JSON parse / Zod validation errors from AI response
  if (err instanceof SyntaxError) {
    throw new AnalysisError("AI yanıtı geçerli JSON değil", 502, "ai-parse", err);
  }
  if (err instanceof z.ZodError) {
    throw new AnalysisError("AI yanıtı beklenen formatta değil", 502, "ai-parse", err);
  }

  throw new AnalysisError(
    `AI servisi hatası: ${(err as Error)?.message || "Bilinmeyen hata"}`,
    502,
    "ai",
    err
  );
}

export interface AnalysisParams {
  owner: string;
  repo: string;
  prNumber: number;
  githubToken: string;
  aiProvider: string;
  aiApiKey: string;
  userId: string;
  model?: string;
}

export interface AnalysisResult {
  report: AnalysisReport;
  configSource: string;
  headSha: string;
}

export interface CodeReviewResult {
  codeReview: CodeReviewItem[];
  headSha: string;
  prTitle: string;
}

export async function runAnalysis(params: AnalysisParams): Promise<AnalysisResult> {
  const { owner, repo, prNumber, githubToken, aiProvider, aiApiKey, userId, model } = params;

  // 1. Resolve config
  const { config: impactMapConfig, source: configSource } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff + PR info
  const platform = new GitHubPlatform(githubToken, owner, repo);
  let rawDiff: string;
  let prTitle: string;
  let headSha: string;
  try {
    const [diff, prInfo] = await Promise.all([
      platform.getDiff(prNumber),
      platform.getPRInfo(prNumber),
    ]);
    rawDiff = diff;
    prTitle = prInfo.title;
    headSha = prInfo.headSha;
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleGitHubError(err, "PR veya repo");
  }

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. Codebase context (best-effort)
  const codebaseContext = await getOrBuildCodebaseContext(owner, repo, githubToken, userId, parsedFiles);

  // 6. AI test generation
  let testScenarios;
  try {
    const provider = createAIProvider(aiProvider, aiApiKey, model);
    const testGen = new TestGenerator(provider);
    testScenarios = await testGen.generate(impact, parsedFiles, 10, codebaseContext);
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleAIError(err);
  }

  // 7. Build report
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
  const { owner, repo, prNumber, githubToken, aiProvider, aiApiKey, userId, model } = params;

  // 1. Resolve config
  const { config: impactMapConfig } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff + PR info
  const platform = new GitHubPlatform(githubToken, owner, repo);
  let rawDiff: string;
  let headSha: string;
  let prTitle: string;
  try {
    const [diff, prInfo] = await Promise.all([
      platform.getDiff(prNumber),
      platform.getPRInfo(prNumber),
    ]);
    rawDiff = diff;
    headSha = prInfo.headSha;
    prTitle = prInfo.title;
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleGitHubError(err, "PR veya repo");
  }

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. Codebase context (best-effort)
  const codebaseContext = await getOrBuildCodebaseContext(owner, repo, githubToken, userId, parsedFiles);

  // 6. AI code review
  let codeReview;
  try {
    const provider = createAIProvider(aiProvider, aiApiKey, model);
    const reviewGen = new CodeReviewGenerator(provider);
    codeReview = await reviewGen.generate(impact, parsedFiles, 10, codebaseContext);
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleAIError(err);
  }

  return { codeReview, headSha, prTitle };
}

export interface BranchAnalysisParams {
  owner: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  githubToken: string;
  aiProvider: string;
  aiApiKey: string;
  userId: string;
  model?: string;
}

export async function runBranchAnalysis(params: BranchAnalysisParams): Promise<AnalysisResult> {
  const { owner, repo, baseBranch, headBranch, githubToken, aiProvider, aiApiKey, userId, model } = params;

  // 1. Resolve config
  const { config: impactMapConfig, source: configSource } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff between branches
  const platform = new GitHubPlatform(githubToken, owner, repo);
  let rawDiff: string;
  let headSha: string;
  try {
    const [diff, compareInfo] = await Promise.all([
      platform.compareBranches(baseBranch, headBranch),
      platform.getBranchCompareInfo(baseBranch, headBranch),
    ]);
    rawDiff = diff;
    headSha = compareInfo.headSha;
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleGitHubError(err, "Branch");
  }

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. Codebase context (best-effort)
  const codebaseContext = await getOrBuildCodebaseContext(owner, repo, githubToken, userId, parsedFiles);

  // 6. AI test generation
  let testScenarios;
  try {
    const provider = createAIProvider(aiProvider, aiApiKey, model);
    const testGen = new TestGenerator(provider);
    testScenarios = await testGen.generate(impact, parsedFiles, 10, codebaseContext);
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleAIError(err);
  }

  // 7. Build report
  const report: AnalysisReport = {
    prNumber: 0,
    prTitle: `Branch Analizi: ${headBranch} vs ${baseBranch}`,
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

export async function runBranchCodeReview(params: BranchAnalysisParams): Promise<CodeReviewResult> {
  const { owner, repo, baseBranch, headBranch, githubToken, aiProvider, aiApiKey, userId, model } = params;

  // 1. Resolve config
  const { config: impactMapConfig } = await resolveConfig(owner, repo, githubToken, userId);

  // 2. Get diff between branches
  const platform = new GitHubPlatform(githubToken, owner, repo);
  let rawDiff: string;
  let headSha: string;
  try {
    const [diff, compareInfo] = await Promise.all([
      platform.compareBranches(baseBranch, headBranch),
      platform.getBranchCompareInfo(baseBranch, headBranch),
    ]);
    rawDiff = diff;
    headSha = compareInfo.headSha;
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleGitHubError(err, "Branch");
  }

  // 3. Parse diff
  const parser = new DiffParser();
  const parsedFiles = parser.parse(rawDiff);

  // 4. Impact analysis
  const analyzer = new ImpactAnalyzer(impactMapConfig);
  const impact = analyzer.analyze(parsedFiles);

  // 5. Codebase context (best-effort)
  const codebaseContext = await getOrBuildCodebaseContext(owner, repo, githubToken, userId, parsedFiles);

  // 6. AI code review
  let codeReview;
  try {
    const provider = createAIProvider(aiProvider, aiApiKey, model);
    const reviewGen = new CodeReviewGenerator(provider);
    codeReview = await reviewGen.generate(impact, parsedFiles, 10, codebaseContext);
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    handleAIError(err);
  }

  return { codeReview, headSha, prTitle: `Branch Analizi: ${headBranch} vs ${baseBranch}` };
}

export async function getOrBuildCodebaseIndex(
  owner: string,
  repo: string,
  githubToken: string,
  userId: string
): Promise<CodebaseIndex | null> {
  const repoFullName = `${owner}/${repo}`;

  // 1. Check for cached index in Firebase
  const existing = await getCodebaseIndex(userId, repoFullName);

  if (existing) {
    // 2. Get current HEAD sha to check freshness
    let currentHeadSha: string;
    try {
      const octokit = new Octokit({ auth: githubToken });
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${repoData.default_branch}`,
      });
      currentHeadSha = refData.object.sha;
    } catch {
      // If we can't get HEAD sha, use cached index anyway
      const index: CodebaseIndex = JSON.parse(existing.indexData);
      console.log("Using cached codebase index (could not verify freshness)");
      return index;
    }

    if (existing.commitSha === currentHeadSha) {
      const index: CodebaseIndex = JSON.parse(existing.indexData);
      console.log("Using cached codebase index");
      return index;
    }
  }

  // 3. Build new index
  const index = await buildCodebaseIndex(owner, repo, githubToken);

  // 4. Save to Firebase
  await saveCodebaseIndex(userId, repoFullName, {
    commitSha: index.commitSha,
    indexData: JSON.stringify(index),
    createdAt: index.createdAt,
  });

  return index;
}

async function getOrBuildCodebaseContext(
  owner: string,
  repo: string,
  githubToken: string,
  userId: string,
  parsedFiles: ParsedFile[]
): Promise<string | undefined> {
  const changedFilePaths = parsedFiles.map((f) => f.path);

  try {
    const index = await getOrBuildCodebaseIndex(owner, repo, githubToken, userId);
    if (!index) return undefined;
    return retrieveContext(index, changedFilePaths);
  } catch (err) {
    // Codebase indexing is best-effort — don't fail the analysis
    console.warn("Codebase indexing failed, continuing without context:", (err as Error)?.message);
    return undefined;
  }
}

function createAIProvider(provider: string, apiKey: string, model?: string): AIProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey, model);
    case "claude":
    default:
      return new ClaudeProvider(apiKey, model);
  }
}
