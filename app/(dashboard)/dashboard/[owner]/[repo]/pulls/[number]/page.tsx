"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AnalysisResult } from "@/components/analysis-result";
import { AnalysisSkeleton } from "@/components/skeletons";
import type { AnalysisReport } from "@/lib/core/types";

interface AnalysisStatus {
  hasHistory: boolean;
  needsReanalysis: boolean;
  currentHeadSha: string;
  lastAnalysis?: {
    id: string;
    commitSha: string;
    createdAt: string;
    prTitle: string;
    report: AnalysisReport;
  };
}

interface HistorySummary {
  id: string;
  commitSha: string;
  prTitle: string;
  createdAt: string;
  configSource: string;
  riskLevel: string;
  filesChanged: number;
  featuresAffected: number;
}

const RISK_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

export default function AnalysisPage() {
  const params = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [commitSha, setCommitSha] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyReport, setHistoryReport] = useState<AnalysisReport | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<{ needsReanalysis: boolean; currentHeadSha: string } | null>(null);

  // Checkbox state
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prNumber = parseInt(params.number, 10);
  const isValidPR = !isNaN(prNumber) && prNumber > 0;

  const runNewAnalysis = useCallback(async () => {
    setAnalyzing(true);
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
        setAnalyzing(false);
        return;
      }

      const data = await res.json();
      const { commitSha: sha, ...reportData } = data;
      setReport(reportData as AnalysisReport);
      setCommitSha(sha || "");
      setStatusInfo((prev) => prev ? { ...prev, needsReanalysis: false, currentHeadSha: sha || prev.currentHeadSha } : null);
    } catch {
      setError("Analiz sirasinda beklenmeyen bir hata olustu");
    }
    setAnalyzing(false);
  }, [params.owner, params.repo, prNumber]);

  // Load status on mount - NO auto-analysis
  useEffect(() => {
    if (!isValidPR) {
      setError("Gecersiz PR numarasi");
      setLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(
          `/api/analyze/status?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}&prNumber=${prNumber}`
        );

        if (!res.ok) {
          setStatusInfo({ needsReanalysis: false, currentHeadSha: "" });
          setReport(null);
          setLoading(false);
          return;
        }

        const status: AnalysisStatus = await res.json();

        if (status.hasHistory && !status.needsReanalysis && status.lastAnalysis) {
          setReport(status.lastAnalysis.report);
          setCommitSha(status.lastAnalysis.commitSha);
          setStatusInfo({ needsReanalysis: false, currentHeadSha: status.currentHeadSha });
        } else if (status.hasHistory && status.needsReanalysis && status.lastAnalysis) {
          setReport(status.lastAnalysis.report);
          setCommitSha(status.lastAnalysis.commitSha);
          setStatusInfo({ needsReanalysis: true, currentHeadSha: status.currentHeadSha });
        } else {
          // No history - do NOT auto-analyze, just show button
          setStatusInfo({ needsReanalysis: false, currentHeadSha: status.currentHeadSha });
          setReport(null);
        }
      } catch {
        setStatusInfo({ needsReanalysis: false, currentHeadSha: "" });
        setReport(null);
      }
      setLoading(false);
    }

    checkStatus();
  }, [params.owner, params.repo, prNumber, isValidPR]);

  // Load checkbox state on mount
  useEffect(() => {
    if (!isValidPR) return;

    async function loadChecks() {
      try {
        const res = await fetch(
          `/api/analyze/checks?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}&prNumber=${prNumber}`
        );
        if (res.ok) {
          const data = await res.json();
          setCheckedIds(data.checks || {});
        }
      } catch {
        // Non-critical, ignore
      }
    }

    loadChecks();
  }, [params.owner, params.repo, prNumber, isValidPR]);

  // Save checks to Firebase with debounce
  const saveChecks = useCallback((newChecks: Record<string, boolean>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch("/api/analyze/checks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: params.owner,
            repo: params.repo,
            prNumber,
            checks: newChecks,
          }),
        });
      } catch {
        // Non-critical
      }
    }, 500);
  }, [params.owner, params.repo, prNumber]);

  function handleToggleCheck(scenarioId: string) {
    setCheckedIds((prev) => {
      const updated = { ...prev, [scenarioId]: !prev[scenarioId] };
      saveChecks(updated);
      return updated;
    });
  }

  async function loadHistory() {
    if (history.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/analyze/history?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}&prNumber=${prNumber}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      toast.error("Gecmis yuklenemedi");
    }
    setHistoryLoading(false);
  }

  async function loadHistoryDetail(id: string) {
    setSelectedHistoryId(id);
    setHistoryReport(null);
    try {
      const res = await fetch(
        `/api/analyze/history?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}&prNumber=${prNumber}&id=${encodeURIComponent(id)}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryReport(data.report);
      }
    } catch {
      toast.error("Analiz detayi yuklenemedi");
    }
  }

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

  async function handleReanalyze() {
    setError("");
    await runNewAnalysis();
    setHistory([]);
  }

  async function handleFirstAnalysis() {
    setError("");
    await runNewAnalysis();
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

      {/* Status Banner */}
      {statusInfo && report && !loading && (
        <div className={`mb-4 flex items-center justify-between rounded-lg p-3 ${
          statusInfo.needsReanalysis
            ? "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
            : "bg-[var(--color-success-light)] text-[var(--color-success)]"
        }`}>
          {statusInfo.needsReanalysis ? (
            <>
              <span className="text-sm font-medium">
                Son analizden bu yana yeni commit&apos;ler mevcut
              </span>
              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="rounded-lg bg-[var(--color-warning)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
              >
                {analyzing ? "Analiz ediliyor..." : "Tekrar Analiz Et"}
              </button>
            </>
          ) : (
            <span className="text-sm font-medium">
              Son commit ile guncel ({commitSha.substring(0, 7)})
            </span>
          )}
        </div>
      )}

      {/* No analysis yet - show button */}
      {!loading && !analyzing && !report && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)]">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
            Henuz analiz yapilmadi
          </h3>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            Bu PR icin henuz bir analiz bulunmuyor. Analiz baslatmak icin asagidaki butona tiklayin.
          </p>
          <button
            onClick={handleFirstAnalysis}
            className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] active:scale-95 transition-all"
          >
            Analiz Et
          </button>
        </div>
      )}

      {/* Tabs */}
      {!loading && report && (
        <div className="mb-6 flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "current"
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Guncel Analiz
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              loadHistory();
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Gecmis Analizler
          </button>
        </div>
      )}

      {(loading || analyzing) && <AnalysisSkeleton />}

      {error && (
        <div className="rounded-lg bg-[var(--color-danger-light)] p-4 text-[var(--color-danger)]">{error}</div>
      )}

      {/* Current Analysis Tab */}
      {activeTab === "current" && report && !loading && !analyzing && (
        <>
          <AnalysisResult
            report={report}
            checkedIds={checkedIds}
            onToggleCheck={handleToggleCheck}
          />

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
              Yapilandirmayi Duzenle
            </Link>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div>
          {historyLoading && (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              Gecmis yukleniyor...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              Henuz gecmis analiz bulunmuyor.
            </div>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadHistoryDetail(item.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-all hover:border-[var(--color-accent)] ${
                    selectedHistoryId === item.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-primary)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {new Date(item.createdAt).toLocaleString("tr-TR")}
                      </span>
                      <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]">
                        {item.commitSha.substring(0, 7)}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {item.filesChanged} dosya, {item.featuresAffected} ozellik
                      </span>
                      <span className="text-sm">
                        {RISK_EMOJI[item.riskLevel] || "⚪"} {item.riskLevel}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected history detail */}
          {selectedHistoryId && (
            <div className="mt-6">
              {!historyReport ? (
                <div className="py-4 text-center text-[var(--color-text-muted)]">
                  Rapor yukleniyor...
                </div>
              ) : (
                <AnalysisResult report={historyReport} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
