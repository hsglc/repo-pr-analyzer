"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AnalysisResult } from "@/components/analysis-result";
import { AnalysisSkeleton } from "@/components/skeletons";
import type { AnalysisReport, CodeReviewItem } from "@/lib/core/types";

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

  // Code review state
  const [codeReview, setCodeReview] = useState<CodeReviewItem[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [postingReview, setPostingReview] = useState(false);

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
        setError(data.error || "Analiz sırasında hata oluştu");
        setAnalyzing(false);
        return;
      }

      const data = await res.json();
      const { commitSha: sha, ...reportData } = data;
      setReport(reportData as AnalysisReport);
      setCommitSha(sha || "");
      setStatusInfo((prev) => prev ? { ...prev, needsReanalysis: false, currentHeadSha: sha || prev.currentHeadSha } : null);
    } catch {
      setError("Analiz sırasında beklenmeyen bir hata oluştu");
    }
    setAnalyzing(false);
  }, [params.owner, params.repo, prNumber]);

  const runCodeReview = useCallback(async () => {
    setReviewing(true);
    try {
      const res = await fetch("/api/analyze/code-review", {
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
        toast.error(data.error || "Kod inceleme sırasında hata oluştu");
        setReviewing(false);
        return;
      }

      const data = await res.json();
      setCodeReview(data.codeReview || []);
      toast.success(`Kod inceleme tamamlandı: ${data.codeReview?.length || 0} bulgu`);
    } catch {
      toast.error("Kod inceleme sırasında beklenmeyen bir hata oluştu");
    }
    setReviewing(false);
  }, [params.owner, params.repo, prNumber]);

  async function handlePostReviewToGitHub() {
    if (codeReview.length === 0) return;
    setPostingReview(true);

    try {
      const res = await fetch("/api/analyze/post-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          prNumber,
          codeReview,
        }),
      });

      if (res.ok) {
        toast.success("Review başarıyla GitHub'a gönderildi!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Review gönderilirken hata oluştu");
      }
    } catch {
      toast.error("Review gönderilirken hata oluştu");
    }
    setPostingReview(false);
  }

  // Load status on mount - NO auto-analysis
  useEffect(() => {
    if (!isValidPR) {
      setError("Geçersiz PR numarası");
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
      toast.error("Geçmiş yüklenemedi");
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
      toast.error("Analiz detayı yüklenemedi");
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
          report: { ...report, codeReview },
        }),
      });

      if (res.ok) {
        toast.success("Yorum başarıyla PR'a yazıldı!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Yorum yazılırken hata oluştu");
      }
    } catch {
      toast.error("Yorum yazılırken hata oluştu");
    }
    setPosting(false);
  }

  async function handleReanalyze() {
    setError("");
    setCodeReview([]);
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
          &larr; PR listesine dön
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
              Son commit ile güncel ({commitSha.substring(0, 7)})
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
            Henüz analiz yapılmadı
          </h3>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            Bu PR için henüz bir analiz bulunmuyor. Analiz başlatmak için aşağıdaki butona tıklayın.
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
            Güncel Analiz
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
            Geçmiş Analizler
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
            codeReview={codeReview}
          />

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handlePostToPR}
              disabled={posting}
              className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
            >
              {posting ? "Yazılıyor..." : "PR'a Yaz"}
            </button>

            <button
              onClick={runCodeReview}
              disabled={reviewing}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition-all"
            >
              {reviewing ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Kod İnceleniyor...
                </span>
              ) : "Kod İnceleme"}
            </button>

            {codeReview.length > 0 && (
              <button
                onClick={handlePostReviewToGitHub}
                disabled={postingReview}
                className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {postingReview ? "Gönderiliyor..." : "GitHub'a Review Olarak Gönder"}
              </button>
            )}

            <Link
              href={`/settings/configs/${params.owner}/${params.repo}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Yapılandırmayı Düzenle
            </Link>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div>
          {historyLoading && (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              Geçmiş yükleniyor...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="py-8 text-center text-[var(--color-text-muted)]">
              Henüz geçmiş analiz bulunmuyor.
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
                        {item.filesChanged} dosya, {item.featuresAffected} özellik
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
                  Rapor yükleniyor...
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
