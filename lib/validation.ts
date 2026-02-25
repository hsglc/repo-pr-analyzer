import { z } from "zod";

export const ownerSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/);
export const repoSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/);
export const branchSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9._\/-]+$/);
export const modelSchema = z.string().max(100).optional();

export function validateOwnerRepoParams(searchParams: URLSearchParams): {
  ok: true;
  data: { owner: string; repo: string };
} | {
  ok: false;
  error: string;
} {
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return { ok: false, error: "owner ve repo gerekli" };
  }

  const ownerResult = ownerSchema.safeParse(owner);
  if (!ownerResult.success) {
    return { ok: false, error: "Geçersiz owner parametresi" };
  }

  const repoResult = repoSchema.safeParse(repo);
  if (!repoResult.success) {
    return { ok: false, error: "Geçersiz repo parametresi" };
  }

  return { ok: true, data: { owner: ownerResult.data, repo: repoResult.data } };
}

export function validateOwnerRepoPRParams(searchParams: URLSearchParams): {
  ok: true;
  data: { owner: string; repo: string; prNumber: number };
} | {
  ok: false;
  error: string;
} {
  const baseResult = validateOwnerRepoParams(searchParams);
  if (!baseResult.ok) return baseResult;

  const prNumberRaw = searchParams.get("prNumber");
  if (!prNumberRaw) {
    return { ok: false, error: "prNumber gerekli" };
  }

  const prNumber = parseInt(prNumberRaw, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    return { ok: false, error: "Geçersiz prNumber parametresi" };
  }

  return { ok: true, data: { ...baseResult.data, prNumber } };
}
