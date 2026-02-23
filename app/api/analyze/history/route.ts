import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAnalysisHistory } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("prNumber");
  const id = searchParams.get("id");

  if (!owner || !repo || !prNumber) {
    return NextResponse.json({ error: "owner, repo ve prNumber gerekli" }, { status: 400 });
  }

  try {
    const history = await getAnalysisHistory(
      userId,
      `${owner}/${repo}`,
      parseInt(prNumber, 10)
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
}
