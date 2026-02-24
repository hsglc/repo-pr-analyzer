"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PRListItem } from "@/components/pr-list-item";
import { PRListSkeleton } from "@/components/skeletons";
import Link from "next/link";

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

export default function PullsPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const [pulls, setPulls] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaries, setSummaries] = useState<Record<number, AnalysisSummary>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/repos/${params.owner}/${params.repo}/pulls`
        );
        if (!res.ok) {
          setError("PR'lar yüklenirken hata oluştu");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setPulls(data);
      } catch {
        setError("PR'lar yuklenirken beklenmeyen bir hata olustu");
      }
      setLoading(false);
    }
    load();
  }, [params.owner, params.repo]);

  // Load analysis summaries after PRs are loaded
  useEffect(() => {
    if (pulls.length === 0) return;

    async function loadSummaries() {
      try {
        const res = await fetch(
          `/api/analyze/repo-summary?owner=${encodeURIComponent(params.owner)}&repo=${encodeURIComponent(params.repo)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSummaries(data.summaries || {});
        }
      } catch {
        // Non-critical, ignore
      }
    }
    loadSummaries();
  }, [params.owner, params.repo, pulls.length]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <Link
            href={`/dashboard/${params.owner}/${params.repo}`}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            &larr; Repoya dön
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {params.owner}/{params.repo} - Açık PR&apos;ler
          </h2>
        </div>
        <PRListSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-[var(--color-danger-light)] p-4 text-[var(--color-danger)]">{error}</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/dashboard/${params.owner}/${params.repo}`}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          &larr; Repoya dön
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
          {params.owner}/{params.repo} - Açık PR&apos;ler
        </h2>
      </div>

      {pulls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)]">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Açık PR bulunamadi</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Bu depoda şu an açık PR bulunmuyor.</p>
        </div>
      ) : (
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
  );
}
