"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RepoCard } from "@/components/repo-card";
import { RepoCardSkeletonGrid } from "@/components/skeletons";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  isPrivate: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/repos");
        if (res.status === 400) {
          router.push("/settings");
          return;
        }
        if (!res.ok) {
          setError("Repolar yuklenirken hata olustu");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setRepos(data);
      } catch {
        setError("Repolar yuklenirken beklenmeyen bir hata olustu");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Repolar</h2>
        </div>
        <RepoCardSkeletonGrid />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-[var(--color-danger-light)] p-4 text-[var(--color-danger)]">{error}</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Repolar</h2>
        <input
          type="text"
          placeholder="Repo ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)]">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Repo bulunamadi</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {search ? "Arama kriterlerinize uygun repo bulunamadi." : "GitHub hesabinizda repo bulunamadi."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
