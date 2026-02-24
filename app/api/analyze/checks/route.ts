import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-server";
import { getScenarioChecks, saveScenarioChecks } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("prNumber");

  if (!owner || !repo || !prNumber) {
    return NextResponse.json({ error: "owner, repo ve prNumber gerekli" }, { status: 400 });
  }

  try {
    const checks = await getScenarioChecks(userId, `${owner}/${repo}`, parseInt(prNumber, 10));
    return NextResponse.json({ checks });
  } catch (error) {
    console.error("Get checks error:", error);
    return NextResponse.json({ error: "Checkler yüklenemedi" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = auth.uid;

  try {
    const body = await request.json();
    const { owner, repo, prNumber, checks } = body;

    if (!owner || !repo || !prNumber || !checks) {
      return NextResponse.json({ error: "owner, repo, prNumber ve checks gerekli" }, { status: 400 });
    }

    await saveScenarioChecks(userId, `${owner}/${repo}`, prNumber, checks);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save checks error:", error);
    return NextResponse.json({ error: "Checkler kaydedilemedi" }, { status: 500 });
  }
}
