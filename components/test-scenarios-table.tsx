"use client";

import { useState } from "react";
import { ScenarioDetail } from "./scenario-detail";
import type { TestScenario } from "@/lib/core/types";

type SortKey = "id" | "priority" | "type" | "feature";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function TestScenariosTable({
  scenarios,
  checkedIds,
  onToggleCheck,
}: {
  scenarios: TestScenario[];
  checkedIds?: Record<string, boolean>;
  onToggleCheck?: (scenarioId: string) => void;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered =
    filterType === "all"
      ? scenarios
      : scenarios.filter((s) => s.type === filterType);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") {
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    }
    if (sortBy === "id") return a.id.localeCompare(b.id);
    if (sortBy === "type") return a.type.localeCompare(b.type);
    return a.feature.localeCompare(b.feature);
  });

  const types = [...new Set(scenarios.map((s) => s.type))];
  const checkedCount = checkedIds
    ? scenarios.filter((s) => checkedIds[s.id]).length
    : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Test Senaryoları
          {checkedIds ? (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({checkedCount}/{scenarios.length} tamamlandı)
            </span>
          ) : (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              ({scenarios.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
          >
            <option value="all">Tüm tipler</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
          >
            <option value="priority">Öncelik</option>
            <option value="id">ID</option>
            <option value="type">Tip</option>
            <option value="feature">Özellik</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((scenario) => (
          <ScenarioDetail
            key={scenario.id}
            scenario={scenario}
            checked={checkedIds?.[scenario.id] ?? false}
            onToggle={onToggleCheck ? () => onToggleCheck(scenario.id) : undefined}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-[var(--color-text-muted)]">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <h3 className="mb-1 font-semibold text-[var(--color-text-primary)]">Senaryo bulunamadı</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Filtreye uygun test senaryosu bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}
