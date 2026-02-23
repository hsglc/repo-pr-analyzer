"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AnalysisResult } from "@/components/analysis-result";
import { AnalysisSkeleton } from "@/components/skeletons";
import type { AnalysisReport } from "@/lib/core/types";

export default function AnalysisPage() {
  const params = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const prNumber = parseInt(params.number, 10);
  const isValidPR = !isNaN(prNumber) && prNumber > 0;

  useEffect(() => {
    if (!isValidPR) {
      setError("Gecersiz PR numarasi");
      setLoading(false);
      return;
    }

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: params.owner,
            repo: params.repo,
            prNumber,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Analiz sirasinda hata olustu");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setReport(data);
        setLoading(false);
      } catch {
        setError("Analiz sirasinda beklenmeyen bir hata olustu");
        setLoading(false);
      }
    }
    analyze();
  }, [params.owner, params.repo, prNumber, isValidPR]);

  async function handlePostToPR() {
    if (!report) return;
    setPosting(true);

    try {
      const res = await fetch("/api/analyze/post-to-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          prNumber,
          report,
        }),
      });

      if (res.ok) {
        toast.success("Comment basariyla PR'a yazildi!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Comment yazilirken hata olustu");
      }
    } catch {
      toast.error("Comment yazilirken hata olustu");
    }
    setPosting(false);
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/dashboard/${params.owner}/${params.repo}/pulls`}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          &larr; PR listesine don
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
          PR #{params.number} Analizi
        </h2>
      </div>

      {loading && <AnalysisSkeleton />}

      {error && (
        <div className="rounded-lg bg-[var(--color-danger-light)] p-4 text-[var(--color-danger)]">{error}</div>
      )}

      {report && (
        <>
          <AnalysisResult report={report} />

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handlePostToPR}
              disabled={posting}
              className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
            >
              {posting ? "Yaziliyor..." : "PR'a Yaz"}
            </button>
            <Link
              href={`/settings/configs/${params.owner}/${params.repo}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Config Duzenle
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
