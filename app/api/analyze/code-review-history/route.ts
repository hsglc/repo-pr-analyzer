import { NextResponse } from "next/server";
import { verifyAuth, withRequestContext } from "@/lib/auth-server";
import { getCodeReviewHistory } from "@/lib/db";
import { validateOwnerRepoPRParams } from "@/lib/validation";
import type { CodeReviewItem } from "@/lib/core/types";

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
    const history = await getCodeReviewHistory(
      userId,
      `${owner}/${repo}`,
      prNumber
    );

    if (!history) {
      return NextResponse.json({ history: [] });
    }

    // If specific ID requested, return full review
    if (id) {
      const entry = history.find((h) => h.id === id);
      if (!entry) {
        return NextResponse.json({ error: "Kod inceleme bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({
        ...entry,
        codeReview: JSON.parse(entry.codeReview),
      });
    }

    // Otherwise return summary list (without full review data)
    const summaries = history.map((h) => {
      const items: CodeReviewItem[] = JSON.parse(h.codeReview);
      const totalFindings = items.length;
      const criticalCount = items.filter((i) => i.severity === "critical").length;
      const warningCount = items.filter((i) => i.severity === "warning").length;

      return {
        id: h.id,
        commitSha: h.commitSha,
        prTitle: h.prTitle,
        createdAt: h.createdAt,
        totalFindings,
        criticalCount,
        warningCount,
      };
    });

    return NextResponse.json({ history: summaries });
  } catch (error) {
    console.error("Code review history error:", error);
    return NextResponse.json({ error: "Kod inceleme geçmişi yüklenemedi" }, { status: 500 });
  }
  });
}
