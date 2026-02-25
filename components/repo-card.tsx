"use client";

import Link from "next/link";

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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Az once";
  if (diffMins < 60) return `${diffMins} dk once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays < 7) return `${diffDays} gun once`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta once`;
  return new Date(dateStr).toLocaleDateString("tr-TR");
}

export function RepoCard({ repo }: { repo: Repo }) {
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || "#6b7280" : undefined;

  return (
    <Link
      href={`/dashboard/${repo.owner}/${repo.name}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--color-accent)]/30"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Language color bar at top */}
      {langColor ? (
        <div
          className="h-0.5 w-full transition-all duration-300 group-hover:h-1"
          style={{ backgroundColor: langColor }}
        />
      ) : (
        <div className="h-0.5 w-full bg-[var(--color-bg-tertiary)]" />
      )}

      <div className="p-4">
        {/* Header: name + badge */}
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors sm:text-base">
              {repo.name}
            </h3>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{repo.owner}</p>
          </div>
          {repo.isPrivate && (
            <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
              Gizli
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mb-3.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)] sm:text-sm">
          {repo.description || "Aciklama bulunmuyor"}
        </p>

        {/* Footer: metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: langColor }}
              />
              <span className="truncate">{repo.language}</span>
            </span>
          )}

          {typeof repo.stargazersCount === "number" && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {repo.stargazersCount}
            </span>
          )}

          {typeof repo.forksCount === "number" && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="18" r="3"/>
                <circle cx="6" cy="6" r="3"/>
                <circle cx="18" cy="6" r="3"/>
                <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/>
                <path d="M12 12v3"/>
              </svg>
              {repo.forksCount}
            </span>
          )}

          <span className="flex items-center gap-1 ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="truncate">{timeAgo(repo.updatedAt)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
