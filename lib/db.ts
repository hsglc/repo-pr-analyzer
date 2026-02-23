import { dbGet, dbSet, dbUpdate, dbPush, emailToKey, repoToKey } from "./firebase";

// ─── Types ─────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbApiKeys {
  userId: string;
  githubToken: string;
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  aiProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbRepoConfig {
  userId: string;
  repoFullName: string;
  impactMapConfig: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User ──────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<(DbUser & { apiKeys?: DbApiKeys | null }) | null> {
  const emailKey = emailToKey(email);
  const mapping = await dbGet<{ userId: string }>(`emailIndex/${emailKey}`);
  if (!mapping) return null;

  const user = await dbGet<Omit<DbUser, "id">>(`users/${mapping.userId}`);
  if (!user) return null;

  const apiKeys = await dbGet<DbApiKeys>(`apiKeys/${mapping.userId}`);

  return { id: mapping.userId, ...user, apiKeys };
}

export async function createUser(email: string, passwordHash: string): Promise<DbUser> {
  const now = new Date().toISOString();
  const userData = { email, passwordHash, createdAt: now, updatedAt: now };

  const id = await dbPush("users", userData);

  // Email index for lookup
  await dbSet(`emailIndex/${emailToKey(email)}`, { userId: id });

  return { id, ...userData };
}

// ─── ApiKeys ───────────────────────────────────────────

export async function findApiKeysByUserId(userId: string): Promise<DbApiKeys | null> {
  return dbGet<DbApiKeys>(`apiKeys/${userId}`);
}

export async function upsertApiKeys(
  userId: string,
  data: {
    githubToken: string;
    claudeApiKey: string | null;
    openaiApiKey: string | null;
    aiProvider: string;
  }
): Promise<void> {
  const existing = await dbGet<DbApiKeys>(`apiKeys/${userId}`);
  const now = new Date().toISOString();

  if (existing) {
    await dbUpdate(`apiKeys/${userId}`, { ...data, updatedAt: now });
  } else {
    await dbSet(`apiKeys/${userId}`, {
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ─── Analysis ─────────────────────────────────────────

export interface DbAnalysis {
  report: string;       // JSON.stringify(AnalysisReport)
  commitSha: string;
  prTitle: string;
  createdAt: string;
  configSource: string;
}

export async function saveAnalysis(
  userId: string,
  repoFullName: string,
  prNumber: number,
  data: DbAnalysis
): Promise<string> {
  const key = repoToKey(repoFullName);
  return dbPush(`analyses/${userId}/${key}/${prNumber}`, data);
}

export async function getAnalysisHistory(
  userId: string,
  repoFullName: string,
  prNumber: number
): Promise<(DbAnalysis & { id: string })[] | null> {
  const key = repoToKey(repoFullName);
  const data = await dbGet<Record<string, DbAnalysis>>(
    `analyses/${userId}/${key}/${prNumber}`
  );
  if (!data) return null;

  return Object.entries(data)
    .map(([id, analysis]) => ({ id, ...analysis }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getLatestAnalysis(
  userId: string,
  repoFullName: string,
  prNumber: number
): Promise<(DbAnalysis & { id: string }) | null> {
  const history = await getAnalysisHistory(userId, repoFullName, prNumber);
  if (!history || history.length === 0) return null;
  return history[0];
}

// ─── RepoConfig ────────────────────────────────────────

export async function findRepoConfig(userId: string, repoFullName: string): Promise<DbRepoConfig | null> {
  const key = repoToKey(repoFullName);
  return dbGet<DbRepoConfig>(`repoConfigs/${userId}/${key}`);
}

export async function upsertRepoConfig(
  userId: string,
  repoFullName: string,
  impactMapConfig: string
): Promise<void> {
  const key = repoToKey(repoFullName);
  const existing = await dbGet<DbRepoConfig>(`repoConfigs/${userId}/${key}`);
  const now = new Date().toISOString();

  if (existing) {
    await dbUpdate(`repoConfigs/${userId}/${key}`, { impactMapConfig, updatedAt: now });
  } else {
    await dbSet(`repoConfigs/${userId}/${key}`, {
      userId,
      repoFullName,
      impactMapConfig,
      createdAt: now,
      updatedAt: now,
    });
  }
}
