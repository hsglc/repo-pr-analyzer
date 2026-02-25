"use client";

import { useRef, useState } from "react";
import { RiskBadge } from "./risk-badge";
import type { TestScenario } from "@/lib/core/types";

export function ScenarioDetail({
  scenario,
  checked,
  onToggle,
}: {
  scenario: TestScenario;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`rounded-lg border transition-colors ${
      checked
        ? "border-[var(--color-success)] bg-[var(--color-success-light)]"
        : "border-[var(--color-border)] bg-[var(--color-bg-primary)]"
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-2 p-3 text-left sm:items-center sm:gap-3 sm:p-4"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {onToggle && (
              <input
                type="checkbox"
                checked={checked ?? false}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-success)] accent-[var(--color-success)] cursor-pointer"
              />
            )}
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)] sm:text-sm">{scenario.id}</span>
          </div>
          <p className={`mt-1 text-sm font-medium leading-snug ${
            checked
              ? "text-[var(--color-text-muted)] line-through"
              : "text-[var(--color-text-primary)]"
          }`}>
            {scenario.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <RiskBadge level={scenario.priority} />
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
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
            <span>
              <strong>Özellik:</strong> {scenario.feature}
            </span>
            <span>
              <strong>Tip:</strong> {scenario.type}
            </span>
          </div>

          <div className="mb-3">
            <h4 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Adımlar:</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--color-text-secondary)]">
              {scenario.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Beklenen Sonuç:</h4>
            <p className="text-sm text-[var(--color-text-secondary)]">{scenario.expectedResult}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
