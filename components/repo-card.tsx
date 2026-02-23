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

export function RepoCard({ repo }: { repo: Repo }) {
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || "#6b7280" : undefined;

  return (
    <Link
      href={`/dashboard/${repo.owner}/${repo.name}/pulls`}
      className="gradient-border card-hover block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm overflow-hidden"
    >
      {/* Language color bar at top */}
      {langColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: langColor }}
        />
      )}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-accent)]">{repo.name}</h3>
        {repo.isPrivate && (
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            Gizli
          </span>
        )}
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
        {repo.description || "Açıklama bulunmuyor"}
      </p>

      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            {repo.language}
          </span>
        )}

        {typeof repo.stargazersCount === "number" && (
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {repo.stargazersCount}
          </span>
        )}

        {typeof repo.forksCount === "number" && (
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="18" r="3"/>
              <circle cx="6" cy="6" r="3"/>
              <circle cx="18" cy="6" r="3"/>
              <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/>
              <path d="M12 12v3"/>
            </svg>
            {repo.forksCount}
          </span>
        )}

        <span>{new Date(repo.updatedAt).toLocaleDateString("tr-TR")}</span>
      </div>
    </Link>
  );
}
