import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { getScenarioChecks, saveScenarioChecks } from "@/lib/db";
import { ownerSchema, repoSchema, validateOwnerRepoPRParams } from "@/lib/validation";

export async function GET(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const { searchParams } = new URL(request.url);
  const result = validateOwnerRepoPRParams(searchParams);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { owner, repo, prNumber } = result.data;

  try {
    const checks = await getScenarioChecks(userId, `${owner}/${repo}`, prNumber);
    return NextResponse.json({ checks });
  } catch (error) {
    console.error("Get checks error:", error);
    return NextResponse.json({ error: "Checkler yüklenemedi" }, { status: 500 });
  }
  });
}

const ChecksPutSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  prNumber: z.number().int().positive(),
  checks: z.record(z.string(), z.boolean()),
});

export async function PUT(request: Request) {
  return withRequestContext(async () => {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;

  try {
    const body = await request.json();
    const { owner, repo, prNumber, checks } = ChecksPutSchema.parse(body);

    await saveScenarioChecks(userId, `${owner}/${repo}`, prNumber, checks);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 });
    }
    console.error("Save checks error:", error);
    return NextResponse.json({ error: "Checkler kaydedilemedi" }, { status: 500 });
  }
  });
}
