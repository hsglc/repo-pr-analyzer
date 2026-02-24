"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AnalysisResult } from "@/components/analysis-result";
import { AnalysisSkeleton } from "@/components/skeletons";
import { PRDetailCard } from "@/components/pr-detail-card";
import { CommitHistory } from "@/components/commit-history";
import { DiffViewer } from "@/components/diff-viewer";
import type { AnalysisReport, CodeReviewItem } from "@/lib/core/types";
import { authFetch } from "@/lib/api-client";
import { ModelSelector } from "@/components/model-selector";

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

type TabType = "current" | "history" | "changes" | "commits";

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
  const [activeTab, setActiveTab] = useState<TabType>("current");
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
  const [selectedModel, setSelectedModel] = useState("");

  const prNumber = parseInt(params.number, 10);
  const isValidPR = !isNaN(prNumber) && prNumber > 0;

  const runNewAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          prNumber,
          model: selectedModel || undefined,
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
  }, [params.owner, params.repo, prNumber, selectedModel]);

  const runCodeReview = useCallback(async () => {
    setReviewing(true);
    try {
      const res = await authFetch("/api/analyze/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          prNumber,
          model: selectedModel || undefined,
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
  }, [params.owner, params.repo, prNumber, selectedModel]);

  async function handlePostReviewToGitHub() {
    if (codeReview.length === 0) return;
    setPostingReview(true);

    try {
      const res = await authFetch("/api/analyze/post-review", {
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
        const res = await authFetch(
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
        const res = await authFetch(
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
        await authFetch("/api/analyze/checks", {
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
      const res = await authFetch(
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
      const res = await authFetch(
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
      const res = await authFetch("/api/analyze/post-to-pr", {
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

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    {
      key: "current",
      label: "Güncel Analiz",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
    },
    {
      key: "history",
      label: "Geçmiş",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      key: "changes",
      label: "Değişiklikler",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
          <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          <path d="M9 15h6"/>
        </svg>
      ),
    },
    {
      key: "commits",
      label: "Commit'ler",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="1.05" y1="12" x2="7" y2="12"/>
          <line x1="17.01" y1="12" x2="22.96" y2="12"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <Link
          href={`/dashboard/${params.owner}/${params.repo}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Repoya dön
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
          PR #{params.number} Analizi
        </h2>
      </div>

      {/* PR Detail Card */}
      {isValidPR && (
        <PRDetailCard owner={params.owner} repo={params.repo} prNumber={prNumber} />
      )}

      {/* Model Selector */}
      {isValidPR && !loading && (
        <div className="mb-4">
          <ModelSelector onModelChange={setSelectedModel} />
        </div>
      )}

      {/* Status Banner */}
      {statusInfo && report && !loading && (
        <div className={`mb-4 flex items-center justify-between rounded-xl p-4 ${
          statusInfo.needsReanalysis
            ? "bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20"
            : "bg-[var(--color-success-light)] border border-[var(--color-success)]/20"
        }`}>
          {statusInfo.needsReanalysis ? (
            <>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="text-sm font-medium text-[var(--color-warning)]">
                  Son analizden bu yana yeni commit&apos;ler mevcut
                </span>
              </div>
              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="btn-glow rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #d97706, #ea580c)" }}
              >
                {analyzing ? "Analiz ediliyor..." : "Tekrar Analiz Et"}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span className="text-sm font-medium text-[var(--color-success)]">
                Son commit ile güncel ({commitSha.substring(0, 7)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* No analysis yet - show button */}
      {!loading && !analyzing && !report && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)] animate-float">
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
            className="btn-glow rounded-lg px-6 py-2.5 text-sm font-medium text-white active:scale-95 transition-all"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Analiz Et
            </span>
          </button>
        </div>
      )}

      {/* Tabs - Pill/Segment style */}
      {!loading && report && (
        <div className="mb-6 flex gap-1 rounded-xl bg-[var(--color-bg-tertiary)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "history") loadHistory();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {(loading || analyzing) && <AnalysisSkeleton />}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--color-danger-light)] p-6 text-center">
          <span className="text-[var(--color-danger)]">{error}</span>
          <button
            onClick={handleFirstAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {analyzing ? "Deneniyor..." : "Tekrar Dene"}
          </button>
        </div>
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
              className="btn-glow flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: "var(--gradient-success)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {posting ? "Yazılıyor..." : "PR'a Yaz"}
            </button>

            <button
              onClick={runCodeReview}
              disabled={reviewing}
              className="btn-glow flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
            >
              {reviewing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Kod İnceleniyor...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m16 6 4 14"/>
                    <path d="M12 6v14"/>
                    <path d="M8 8v12"/>
                    <path d="M4 4v16"/>
                  </svg>
                  Kod İnceleme
                </>
              )}
            </button>

            {codeReview.length > 0 && (
              <button
                onClick={handlePostReviewToGitHub}
                disabled={postingReview}
                className="btn-glow flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #ea580c, #dc2626)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
                {postingReview ? "Gönderiliyor..." : "GitHub'a Review Olarak Gönder"}
              </button>
            )}

            <Link
              href={`/settings/configs/${params.owner}/${params.repo}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
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
                  className={`w-full rounded-xl border p-4 text-left transition-all hover:border-[var(--color-accent)] ${
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

      {/* Changes Tab (Diff Viewer) */}
      {activeTab === "changes" && (
        <DiffViewer owner={params.owner} repo={params.repo} prNumber={prNumber} />
      )}

      {/* Commits Tab */}
      {activeTab === "commits" && (
        <CommitHistory owner={params.owner} repo={params.repo} prNumber={prNumber} />
      )}
    </div>
  );
}
