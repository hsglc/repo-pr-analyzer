"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: "add" | "del" | "normal" | "header";
  content: string;
  oldNum?: number;
  newNum?: number;
}

export function DiffViewer({ owner, repo, prNumber }: { owner: string; repo: string; prNumber: number }) {
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(
          `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/diff`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.diff) {
            setFiles(parseDiff(data.diff));
          }
        }
      } catch {
        // Non-critical
      }
      setLoading(false);
    }
    load();
  }, [owner, repo, prNumber]);

  function toggleFile(path: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
            <div className="animate-shimmer h-5 w-64 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--color-text-muted)]">
        Değişiklik bulunamadı veya diff verisi alınamadı.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <div className="mb-2 text-sm text-[var(--color-text-muted)]">
        {files.length} dosya değişti
      </div>

      {files.map((file) => {
        const expanded = expandedFiles.has(file.path);

        return (
          <div key={file.path} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden">
            {/* File header */}
            <button
              onClick={() => toggleFile(file.path)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                </svg>
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[200px] sm:max-w-none">{file.path}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xs font-medium text-[var(--color-success)]">+{file.additions}</span>
                <span className="text-xs font-medium text-[var(--color-danger)]">-{file.deletions}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-[var(--color-text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {/* Diff content */}
            {expanded && (
              <div className="border-t border-[var(--color-border)] overflow-x-auto">
                <table className="w-full text-[11px] font-mono sm:text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {file.lines.map((line, idx) => {
                      let bg = "";
                      let textColor = "text-[var(--color-text-primary)]";
                      if (line.type === "add") {
                        bg = "bg-green-50 dark:bg-green-900/20";
                        textColor = "text-green-800 dark:text-green-300";
                      } else if (line.type === "del") {
                        bg = "bg-red-50 dark:bg-red-900/20";
                        textColor = "text-red-800 dark:text-red-300";
                      } else if (line.type === "header") {
                        bg = "bg-blue-50 dark:bg-blue-900/20";
                        textColor = "text-blue-700 dark:text-blue-400";
                      }

                      return (
                        <tr key={idx} className={bg}>
                          <td className="hidden w-10 select-none px-2 py-0.5 text-right text-[var(--color-text-muted)] border-r border-[var(--color-border)] sm:table-cell">
                            {line.type !== "header" && line.type !== "add" ? line.oldNum || "" : ""}
                          </td>
                          <td className="w-8 select-none px-1 py-0.5 text-right text-[var(--color-text-muted)] border-r border-[var(--color-border)] sm:w-10 sm:px-2">
                            {line.type !== "header" && line.type !== "del" ? line.newNum || "" : ""}
                          </td>
                          <td className={`px-3 py-0.5 whitespace-pre ${textColor}`}>
                            {line.type === "add" && <span className="select-none text-green-600 dark:text-green-400">+ </span>}
                            {line.type === "del" && <span className="select-none text-red-600 dark:text-red-400">- </span>}
                            {line.type === "normal" && <span className="select-none text-transparent">  </span>}
                            {line.content}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileChunks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const lines = chunk.split("\n");
    // Extract file path
    const headerMatch = lines[0]?.match(/b\/(.+)/);
    if (!headerMatch) continue;

    const path = headerMatch[1];
    const diffLines: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;
    let oldLineNum = 0;
    let newLineNum = 0;
    let inHunk = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Hunk header
      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (hunkMatch) {
        oldLineNum = parseInt(hunkMatch[1], 10);
        newLineNum = parseInt(hunkMatch[2], 10);
        inHunk = true;
        diffLines.push({ type: "header", content: line });
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith("+")) {
        additions++;
        diffLines.push({ type: "add", content: line.substring(1), newNum: newLineNum });
        newLineNum++;
      } else if (line.startsWith("-")) {
        deletions++;
        diffLines.push({ type: "del", content: line.substring(1), oldNum: oldLineNum });
        oldLineNum++;
      } else if (line.startsWith(" ") || line === "") {
        diffLines.push({ type: "normal", content: line.substring(1) || "", oldNum: oldLineNum, newNum: newLineNum });
        oldLineNum++;
        newLineNum++;
      }
    }

    files.push({ path, additions, deletions, lines: diffLines });
  }

  return files;
}
