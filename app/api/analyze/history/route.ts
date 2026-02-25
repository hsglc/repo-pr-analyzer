import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { getAnalysisHistory } from "@/lib/db";
import { validateOwnerRepoPRParams } from "@/lib/validation";

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
  const id = searchParams.get("id");

  try {
    const history = await getAnalysisHistory(
      userId,
      `${owner}/${repo}`,
      prNumber
    );

    if (!history) {
      return NextResponse.json({ history: [] });
    }

    // If specific ID requested, return full report
    if (id) {
      const entry = history.find((h) => h.id === id);
      if (!entry) {
        return NextResponse.json({ error: "Analiz bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({
        ...entry,
        report: JSON.parse(entry.report),
      });
    }

    // Otherwise return summary list (without full report)
    const summaries = history.map((h) => {
      const report = JSON.parse(h.report);
      return {
        id: h.id,
        commitSha: h.commitSha,
        prTitle: h.prTitle,
        createdAt: h.createdAt,
        configSource: h.configSource,
        riskLevel: report.impact?.riskLevel,
        filesChanged: report.stats?.filesChanged,
        featuresAffected: report.stats?.featuresAffected,
      };
    });

    return NextResponse.json({ history: summaries });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Geçmiş yüklenemedi" }, { status: 500 });
  }
  });
}
