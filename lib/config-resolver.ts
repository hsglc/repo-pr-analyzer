import { Octokit } from "@octokit/rest";
import { findRepoConfig } from "@/lib/db";
import type { ImpactMapConfig } from "@/lib/core/types";

export interface ResolvedConfig {
  config: ImpactMapConfig;
  source: "repo" | "database" | "default";
}

const DEFAULT_CONFIG: ImpactMapConfig = {
  features: {},
  services: {},
  pages: {},
  ignorePatterns: [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.md",
    "**/.env*",
    "**/node_modules/**",
    "**/dist/**",
    "**/*.lock",
  ],
};

export async function resolveConfig(
  owner: string,
  repo: string,
  githubToken: string,
  userId: string
): Promise<ResolvedConfig> {
  // Layer 1: Try reading from repo root
  try {
    const octokit = new Octokit({ auth: githubToken });
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "impact-map.config.json",
    });

    if ("content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { config: JSON.parse(content) as ImpactMapConfig, source: "repo" };
    }
  } catch {
    // File not found in repo, continue to next layer
  }

  // Layer 2: Try DB override
  try {
    const repoConfig = await findRepoConfig(userId, `${owner}/${repo}`);

    if (repoConfig) {
      return {
        config: JSON.parse(repoConfig.impactMapConfig) as ImpactMapConfig,
        source: "database",
      };
    }
  } catch {
    // DB error, fall through to default
  }

  // Layer 3: Default empty config
  return { config: DEFAULT_CONFIG, source: "default" };
}
