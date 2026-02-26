"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PRListItem } from "@/components/pr-list-item";
import { AnalysisResult } from "@/components/analysis-result";
import { PRListSkeleton, AnalysisSkeleton } from "@/components/skeletons";
import type { AnalysisReport, CodeReviewItem } from "@/lib/core/types";
import { authFetch } from "@/lib/api-client";
import { ModelSelector } from "@/components/model-selector";
import { CodebaseChat } from "@/components/codebase-chat";

type TabType = "pulls" | "branches" | "chat";
type PRState = "open" | "closed" | "all";

interface PR {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  author: { login: string; avatarUrl: string };
  labels: { name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisSummary {
  riskLevel: string;
  createdAt: string;
  commitSha: string;
}

interface Branch {
  name: string;
  protected: boolean;
  sha: string;
}

export default function RepoDetailPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("pulls");

  // PR state
  const [pulls, setPulls] = useState<PR[]>([]);
  const [prLoading, setPrLoading] = useState(true);
  const [prError, setPrError] = useState("");
  const [prState, setPrState] = useState<PRState>("open");
  const [summaries, setSummaries] = useState<Record<number, AnalysisSummary>>({});

  // Branch state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [headBranch, setHeadBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("");

  // Branch analysis state
  const [branchAnalyzing, setBranchAnalyzing] = useState(false);
  const [branchReviewing, setBranchReviewing] = useState(false);
  const [branchReport, setBranchReport] = useState<AnalysisReport | null>(null);
  const [branchCodeReview, setBranchCodeReview] = useState<CodeReviewItem[]>([]);
  const [branchAnalysisError, setBranchAnalysisError] = useState("");
  const [noDiff, setNoDiff] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [lastBranchAction, setLastBranchAction] = useState<"analysis" | "review" | null>(null);

  // Load PRs
  const loadPulls = useCallback(async (state: PRState) => {
    setPrLoading(true);
    setPrError("");
    try {
      const res = await authFetch(
        `/api/repos/${params.owner}/${params.repo}/pulls?state=${state}`
      );
      if (!res.ok) {
        const data = await res.json();
        setPrError(data.error || "PR'lar yüklenirken hata oluştu");
        setPrLoading(false);
        return;
      }
      const data = await res.json();
      setPulls(data);
    } catch {
      setPrError("PR'lar yüklenirken beklenmeyen bir hata oluştu");
    }
    setPrLoading(false);
  }, [params.owner, params.repo]);

  // Load PRs on mount and when state changes
  useEffect(() => {
    loadPulls(prState);
  }, [prState, loadPulls]);

  // Load analysis summaries after PRs
  useEffect(() => {
    if (pulls.length === 0) return;
    async function loadSummaries() {
      try {
        const res = await authFetch(
          `/api/analyze/repo-summary?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSummaries(data.summaries || {});
        }
      } catch {
        // Non-critical
      }
    }
    loadSummaries();
  }, [params.owner, params.repo, pulls.length]);

  // Load branches lazily
  const loadBranches = useCallback(async () => {
    if (branchesLoaded) return;
    setBranchLoading(true);
    setBranchError("");
    try {
      const res = await authFetch(
        `/api/repos/${params.owner}/${params.repo}/branches`
      );
      if (!res.ok) {
        const data = await res.json();
        setBranchError(data.error || "Branch'ler yüklenirken hata oluştu");
        setBranchLoading(false);
        return;
      }
      const data = await res.json();
      setBranches(data.branches || []);
      setDefaultBranch(data.defaultBranch || "");
      setBaseBranch(data.defaultBranch || "");
      setBranchesLoaded(true);
    } catch {
      setBranchError("Branch'ler yüklenirken beklenmeyen bir hata oluştu");
    }
    setBranchLoading(false);
  }, [params.owner, params.repo, branchesLoaded]);

  // Branch analysis
  const handleBranchAnalysis = useCallback(async () => {
    if (!headBranch || !baseBranch) {
      toast.error("Lütfen her iki branch'i de seçin.");
      return;
    }
    if (headBranch === baseBranch) {
      toast.error("Aynı branch seçilemez. Lütfen farklı branch'ler seçin.");
      return;
    }

    setBranchAnalyzing(true);
    setBranchAnalysisError("");
    setBranchReport(null);
    setBranchCodeReview([]);
    setNoDiff(false);
    setLastBranchAction("analysis");

    try {
      const res = await authFetch("/api/analyze/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          baseBranch,
          headBranch,
          model: selectedModel || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBranchAnalysisError(data.error || "Branch analizi sırasında hata oluştu");
        setBranchAnalyzing(false);
        return;
      }

      const data = await res.json();
      const { headSha: _sha, ...reportData } = data;
      const report = reportData as AnalysisReport;

      if (report.stats.filesChanged === 0) {
        setNoDiff(true);
      } else {
        setBranchReport(report);
      }
    } catch {
      setBranchAnalysisError("Branch analizi sırasında beklenmeyen bir hata oluştu");
    }
    setBranchAnalyzing(false);
  }, [params.owner, params.repo, headBranch, baseBranch, selectedModel]);

  // Branch code review
  const handleBranchCodeReview = useCallback(async () => {
    if (!headBranch || !baseBranch) {
      toast.error("Lütfen her iki branch'i de seçin.");
      return;
    }
    if (headBranch === baseBranch) {
      toast.error("Aynı branch seçilemez. Lütfen farklı branch'ler seçin.");
      return;
    }

    setBranchReviewing(true);
    setBranchAnalysisError("");
    setBranchReport(null);
    setBranchCodeReview([]);
    setNoDiff(false);
    setLastBranchAction("review");

    try {
      const res = await authFetch("/api/analyze/branch/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: params.owner,
          repo: params.repo,
          baseBranch,
          headBranch,
          model: selectedModel || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setBranchAnalysisError(data.error || "Kod inceleme sırasında hata oluştu");
        setBranchReviewing(false);
        return;
      }

      const data = await res.json();
      setBranchCodeReview(data.codeReview || []);

      if (data.codeReview?.length > 0) {
        // Create a minimal report to display code review
        setBranchReport({
          prNumber: 0,
          prTitle: `Branch Kod İnceleme: ${headBranch} vs ${baseBranch}`,
          timestamp: new Date().toISOString(),
          impact: { features: [], services: [], pages: [], riskLevel: "low", summary: "" },
          testScenarios: [],
          codeReview: data.codeReview,
          stats: { filesChanged: 0, additions: 0, deletions: 0, featuresAffected: 0 },
        });
        toast.success(`Kod inceleme tamamlandı: ${data.codeReview.length} bulgu`);
      } else {
        setNoDiff(true);
      }
    } catch {
      setBranchAnalysisError("Kod inceleme sırasında beklenmeyen bir hata oluştu");
    }
    setBranchReviewing(false);
  }, [params.owner, params.repo, headBranch, baseBranch, selectedModel]);

  const prStateLabels: { key: PRState; label: string }[] = [
    { key: "open", label: "Açık" },
    { key: "closed", label: "Kapalı" },
    { key: "all", label: "Tümü" },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Repolara dön
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
          {params.owner}/{params.repo}
        </h2>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--color-bg-tertiary)] p-1">
        <button
          onClick={() => setActiveTab("pulls")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "pulls"
              ? "bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3"/>
            <circle cx="6" cy="6" r="3"/>
            <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
            <line x1="6" y1="9" x2="6" y2="21"/>
          </svg>
          Pull Requests
        </button>
        <button
          onClick={() => {
            setActiveTab("branches");
            loadBranches();
          }}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "branches"
              ? "bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"/>
            <circle cx="18" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
          Branch Analizi
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "chat"
              ? "bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
      </div>

      {/* Pull Requests Tab */}
      {activeTab === "pulls" && (
        <div>
          {/* State filter pills */}
          <div className="mb-4 flex gap-2">
            {prStateLabels.map((s) => (
              <button
                key={s.key}
                onClick={() => setPrState(s.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  prState === s.key
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {prLoading && <PRListSkeleton />}

          {prError && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--color-danger-light)] p-6 text-center">
              <span className="text-[var(--color-danger)]">{prError}</span>
              <button
                onClick={() => loadPulls(prState)}
                className="rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!prLoading && !prError && pulls.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)]">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
                {prState === "open" ? "Açık PR bulunamadı" : prState === "closed" ? "Kapalı PR bulunamadı" : "PR bulunamadı"}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Bu depoda {prState === "open" ? "şu an açık" : prState === "closed" ? "kapalı" : ""} PR bulunmuyor.
              </p>
            </div>
          )}

          {!prLoading && !prError && pulls.length > 0 && (
            <div className="space-y-3">
              {pulls.map((pr) => (
                <PRListItem
                  key={pr.number}
                  pr={pr}
                  owner={params.owner}
                  repo={params.repo}
                  analysisSummary={summaries[pr.number]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <CodebaseChat owner={params.owner} repo={params.repo} />
      )}

      {/* Branch Analysis Tab */}
      {activeTab === "branches" && (
        <div>
          {branchLoading && (
            <div className="space-y-4">
              <div className="h-12 animate-shimmer rounded-lg" />
              <div className="h-12 animate-shimmer rounded-lg" />
            </div>
          )}

          {branchError && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--color-danger-light)] p-6 text-center">
              <span className="text-[var(--color-danger)]">{branchError}</span>
              <button
                onClick={() => {
                  setBranchesLoaded(false);
                  loadBranches();
                }}
                className="rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!branchLoading && !branchError && branchesLoaded && (
            <>
              {/* Branch selectors */}
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Head branch */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                    Karşılaştırılacak Branch (head)
                  </label>
                  <select
                    value={headBranch}
                    onChange={(e) => setHeadBranch(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  >
                    <option value="">Branch seçin...</option>
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                        {b.name === defaultBranch ? " (varsayılan)" : ""}
                        {b.protected ? " 🔒" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base branch */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                    Hedef Branch (base)
                  </label>
                  <select
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  >
                    <option value="">Branch seçin...</option>
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                        {b.name === defaultBranch ? " (varsayılan)" : ""}
                        {b.protected ? " 🔒" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model selector */}
              <div className="mb-4">
                <ModelSelector onModelChange={setSelectedModel} />
              </div>

              {/* Same branch warning */}
              {headBranch && baseBranch && headBranch === baseBranch && (
                <div className="mb-4 rounded-xl bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 p-4">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span className="text-sm font-medium text-[var(--color-warning)]">
                      Aynı branch seçilemez. Lütfen farklı branch&apos;ler seçin.
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleBranchAnalysis}
                  disabled={branchAnalyzing || branchReviewing || !headBranch || !baseBranch || headBranch === baseBranch}
                  className="btn-glow flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {branchAnalyzing ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Analiz Ediliyor...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Analiz Et
                    </>
                  )}
                </button>

                <button
                  onClick={handleBranchCodeReview}
                  disabled={branchAnalyzing || branchReviewing || !headBranch || !baseBranch || headBranch === baseBranch}
                  className="btn-glow flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                >
                  {branchReviewing ? (
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
              </div>

              {/* Loading state */}
              {(branchAnalyzing || branchReviewing) && <AnalysisSkeleton />}

              {/* Error state */}
              {branchAnalysisError && (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--color-danger-light)] p-6 text-center">
                  <span className="text-[var(--color-danger)]">{branchAnalysisError}</span>
                  <button
                    onClick={() => {
                      setBranchAnalysisError("");
                      if (lastBranchAction === "review") {
                        handleBranchCodeReview();
                      } else {
                        handleBranchAnalysis();
                      }
                    }}
                    disabled={branchAnalyzing || branchReviewing}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-danger)] px-4 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    {branchAnalyzing || branchReviewing ? "Deneniyor..." : "Tekrar Dene"}
                  </button>
                </div>
              )}

              {/* No diff state */}
              {noDiff && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)]">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    Fark bulunamadı
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5">{headBranch}</code> ve{" "}
                    <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5">{baseBranch}</code>{" "}
                    branch&apos;leri arasında fark bulunmuyor.
                  </p>
                </div>
              )}

              {/* Analysis results */}
              {branchReport && !branchAnalyzing && !branchReviewing && (
                <AnalysisResult
                  report={branchReport}
                  codeReview={branchCodeReview}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
