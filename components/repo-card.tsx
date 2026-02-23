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
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-accent)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-accent)]">{repo.name}</h3>
        {repo.isPrivate && (
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            Gizli
          </span>
        )}
      </div>

      {repo.description && (
        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
          {repo.description}
        </p>
      )}

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
        <span>{new Date(repo.updatedAt).toLocaleDateString("tr-TR")}</span>
      </div>
    </Link>
  );
}
