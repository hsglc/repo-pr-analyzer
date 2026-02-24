"use client";

import { useRef, useState } from "react";
import type { CodeReviewItem } from "@/lib/core/types";

type FilterSeverity = "all" | CodeReviewItem["severity"];
type FilterCategory = "all" | CodeReviewItem["category"];

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  suggestion: 3,
};

const SEVERITY_CONFIG: Record<string, { emoji: string; bg: string; text: string; gradient: string; barColor: string }> = {
  critical: {
    emoji: "🔴",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    gradient: "from-red-500 to-rose-500",
    barColor: "#dc2626",
  },
  warning: {
    emoji: "🟡",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    gradient: "from-yellow-500 to-amber-500",
    barColor: "#d97706",
  },
  info: {
    emoji: "🔵",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    gradient: "from-blue-500 to-cyan-500",
    barColor: "#2563eb",
  },
  suggestion: {
    emoji: "💡",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    gradient: "from-purple-500 to-violet-500",
    barColor: "#7c3aed",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  security: "Güvenlik",
  performance: "Performans",
  maintainability: "Bakım",
  style: "Stil",
};

export function CodeReviewTable({ items }: { items: CodeReviewItem[] }) {
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = items
    .filter((i) => filterSeverity === "all" || i.severity === filterSeverity)
    .filter((i) => filterCategory === "all" || i.category === filterCategory);

  const sorted = [...filtered].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  const severities = [...new Set(items.map((i) => i.severity))];
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Kod İnceleme Bulguları
          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
            ({sorted.length}{filtered.length !== items.length ? `/${items.length}` : ""})
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
          >
            <option value="all">Tüm severity</option>
            {severities.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_CONFIG[s]?.emoji} {s}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
          >
            <option value="all">Tüm kategoriler</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            open={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-[var(--color-text-muted)]">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3 className="mb-1 font-semibold text-[var(--color-text-primary)]">Bulgu bulunamadı</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Filtreye uygun kod inceleme bulgusu bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewItemCard({
  item,
  open,
  onToggle,
}: {
  item: CodeReviewItem;
  open: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
  const location = item.line ? `${item.file}:${item.line}` : item.file;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden">
      <div className="flex">
        {/* Severity color bar on left */}
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: config.barColor }}
        />

        <div className="flex-1">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-between p-4 text-left"
            aria-expanded={open}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r ${config.gradient} text-white`}>
                {config.emoji} {item.severity}
              </span>
              <span className="text-sm font-medium text-[var(--color-text-muted)] shrink-0">{item.id}</span>
              <span className="font-medium text-[var(--color-text-primary)] truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
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
                className={`text-[var(--color-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          <div
            ref={contentRef}
            className="overflow-hidden transition-all duration-200"
            style={{
              maxHeight: open ? contentRef.current?.scrollHeight ?? 500 : 0,
            }}
          >
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="mb-3">
                <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]">
                  {location}
                </code>
              </div>

              <p className="mb-3 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {item.description}
              </p>

              {item.suggestion && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Düzeltme Önerisi:</h4>
                  <pre className="overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: "#1e1e2e", color: "#cdd6f4" }}>
                    <code>{item.suggestion}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
