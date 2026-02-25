import crypto from "crypto";
import { Octokit } from "@octokit/rest";

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function createAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: appId, iat: now - 60, exp: now + 600 })
  ).toString("base64url");

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey, "base64url");

  return `${header}.${payload}.${signature}`;
}

export function isGitHubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

export async function getBotOctokit(
  owner: string,
  repo: string
): Promise<Octokit | null> {
  if (!isGitHubAppConfigured()) {
    return null;
  }

  const cacheKey = `${owner}/${repo}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Octokit({ auth: cached.token });
  }

  const jwt = createAppJWT();
  const appOctokit = new Octokit({ auth: jwt });

  const { data: installation } = await appOctokit.apps.getRepoInstallation({
    owner,
    repo,
  });

  const { data: tokenData } =
    await appOctokit.apps.createInstallationAccessToken({
      installation_id: installation.id,
    });

  // Cache for 55 minutes (token is valid for 1 hour)
  tokenCache.set(cacheKey, {
    token: tokenData.token,
    expiresAt: Date.now() + 55 * 60 * 1000,
  });

  return new Octokit({ auth: tokenData.token });
}
