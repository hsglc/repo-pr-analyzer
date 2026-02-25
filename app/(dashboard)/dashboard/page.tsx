"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RepoCard } from "@/components/repo-card";
import { RepoCardSkeletonGrid } from "@/components/skeletons";
import { authFetch } from "@/lib/api-client";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  isPrivate: boolean;
  stargazersCount?: number;
  forksCount?: number;
}

type Visibility = "all" | "public" | "private";
type SortBy = "updated" | "name" | "stars";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

export default function DashboardPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<Visibility>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/api/repos");
        if (res.status === 400) {
          router.push("/settings");
          return;
        }
        if (!res.ok) {
          setError("Repolar yüklenirken hata oluştu");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setRepos(data);
      } catch {
        setError("Repolar yüklenirken beklenmeyen bir hata oluştu");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Collect unique languages
  const languages = useMemo(() => {
    const langSet = new Set<string>();
    repos.forEach((r) => {
      if (r.language) langSet.add(r.language);
    });
    return Array.from(langSet).sort();
  }, [repos]);

  // Filter & sort
  const filtered = useMemo(() => {
    let result = repos.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (filterLang) {
      result = result.filter((r) => r.language === filterLang);
    }

    if (filterVisibility === "public") {
      result = result.filter((r) => !r.isPrivate);
    } else if (filterVisibility === "private") {
      result = result.filter((r) => r.isPrivate);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "stars":
          return (b.stargazersCount || 0) - (a.stargazersCount || 0);
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [repos, search, filterLang, filterVisibility, sortBy]);

  // Stats
  const totalRepos = repos.length;
  const publicCount = repos.filter((r) => !r.isPrivate).length;
  const privateCount = repos.filter((r) => r.isPrivate).length;
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazersCount || 0), 0);
  const langCounts: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  });
  const topLangs = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">Repolar</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">GitHub repolariniz yukleniyor...</p>
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">Panel</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {totalRepos} repo, {publicCount} public, {privateCount} private
        </p>
      </div>

      {/* Stats Cards */}
      {repos.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Total Repos */}
          <div className="rounded-xl p-4 shadow-sm" style={{ background: "var(--gradient-primary)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-white">{totalRepos}</p>
                <p className="truncate text-xs text-white/70">Toplam Repo</p>
              </div>
            </div>
          </div>

          {/* Public */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-success-light)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{publicCount}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">Public</p>
              </div>
            </div>
          </div>

          {/* Private */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning-light)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{privateCount}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">Private</p>
              </div>
            </div>
          </div>

          {/* Stars */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-light)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalStars}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">Toplam Yildiz</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Distribution */}
      {topLangs.length > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Dil Dagilimi</h3>
          <div className="flex flex-wrap gap-3">
            {topLangs.map(([lang, count]) => (
              <div key={lang} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang] || "#6b7280" }}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">{lang}</span>
                <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {count}
                </span>
              </div>
            ))}
          </div>
          {/* Language bar */}
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
            {topLangs.map(([lang, count]) => (
              <div
                key={lang}
                className="h-full transition-all"
                style={{
                  width: `${(count / totalRepos) * 100}%`,
                  backgroundColor: LANGUAGE_COLORS[lang] || "#6b7280",
                }}
                title={`${lang}: ${count} repo`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter Section */}
      <div className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">
            Repolar
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({filtered.length}{filtered.length !== repos.length ? `/${repos.length}` : ""})
            </span>
          </h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Repo ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-2 pl-10 pr-4 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {/* Visibility pills */}
        <div className="flex gap-1 rounded-lg bg-[var(--color-bg-tertiary)] p-0.5">
          {([
            { key: "all" as Visibility, label: "Tumu" },
            { key: "public" as Visibility, label: "Public" },
            { key: "private" as Visibility, label: "Private" },
          ]).map((v) => (
            <button
              key={v.key}
              onClick={() => setFilterVisibility(v.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filterVisibility === v.key
                  ? "bg-[var(--color-bg-primary)] text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Language filter */}
        <select
          value={filterLang}
          onChange={(e) => setFilterLang(e.target.value)}
          className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          <option value="">Tum Diller</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          <option value="updated">Son guncellenen</option>
          <option value="name">Ada gore</option>
          <option value="stars">Yildiza gore</option>
        </select>

        {/* Active filter clear */}
        {(filterLang || filterVisibility !== "all" || search) && (
          <button
            onClick={() => {
              setFilterLang("");
              setFilterVisibility("all");
              setSearch("");
            }}
            className="rounded-md px-2 py-1.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
          >
            Temizle
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-[var(--color-text-muted)] animate-float">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">Repo bulunamadi</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {search || filterLang || filterVisibility !== "all"
              ? "Filtreleme kriterlerinize uygun repo bulunamadi."
              : "GitHub hesabinizda repo bulunamadi."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
