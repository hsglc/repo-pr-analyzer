"use client";

import { useState } from "react";
import type { ImpactMapConfig } from "@/lib/core/types";

interface InlineInput {
  type: "feature" | "service" | "page" | "path" | "pattern";
  parentKey?: string;
}

export function ConfigEditor({
  config,
  onSave,
  saving,
}: {
  config: ImpactMapConfig;
  onSave: (config: ImpactMapConfig) => void;
  saving: boolean;
}) {
  const [rawMode, setRawMode] = useState(false);
  const [json, setJson] = useState(JSON.stringify(config, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [inlineInput, setInlineInput] = useState<InlineInput | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Structured state
  const [features, setFeatures] = useState(config.features);
  const [services, setServices] = useState(config.services);
  const [pages, setPages] = useState(config.pages);
  const [ignorePatterns, setIgnorePatterns] = useState(config.ignorePatterns);

  function handleModeToggle() {
    if (rawMode) {
      // Raw -> Structured: parse JSON and sync to structured state
      try {
        const parsed = JSON.parse(json) as ImpactMapConfig;
        setFeatures(parsed.features);
        setServices(parsed.services);
        setPages(parsed.pages);
        setIgnorePatterns(parsed.ignorePatterns);
        setParseError(null);
        setRawMode(false);
      } catch {
        setParseError("Geçersiz JSON - mod değiştirilemiyor");
      }
    } else {
      // Structured -> Raw: serialize structured state to JSON
      const current: ImpactMapConfig = { features, services, pages, ignorePatterns };
      setJson(JSON.stringify(current, null, 2));
      setParseError(null);
      setRawMode(true);
    }
  }

  function handleRawSave() {
    try {
      const parsed = JSON.parse(json) as ImpactMapConfig;
      setParseError(null);
      onSave(parsed);
    } catch {
      setParseError("Geçersiz JSON formatı");
    }
  }

  function handleStructuredSave() {
    onSave({ features, services, pages, ignorePatterns });
  }

  function handleInlineSubmit() {
    const val = inputValue.trim();
    if (!val) {
      setInlineInput(null);
      setInputValue("");
      return;
    }

    if (inlineInput?.type === "feature") {
      setFeatures((prev) => ({
        ...prev,
        [val]: { description: "", paths: [] },
      }));
    } else if (inlineInput?.type === "service") {
      setServices((prev) => ({ ...prev, [val]: [] }));
    } else if (inlineInput?.type === "page") {
      setPages((prev) => ({ ...prev, [val]: [] }));
    } else if (inlineInput?.type === "path" && inlineInput.parentKey) {
      setFeatures((prev) => ({
        ...prev,
        [inlineInput.parentKey!]: {
          ...prev[inlineInput.parentKey!],
          paths: [...prev[inlineInput.parentKey!].paths, val],
        },
      }));
    } else if (inlineInput?.type === "pattern") {
      setIgnorePatterns((prev) => [...prev, val]);
    }

    setInlineInput(null);
    setInputValue("");
  }

  function handleInlineKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineSubmit();
    } else if (e.key === "Escape") {
      setInlineInput(null);
      setInputValue("");
    }
  }

  function removeFeature(name: string) {
    setFeatures((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function removePathFromFeature(featureName: string, index: number) {
    setFeatures((prev) => ({
      ...prev,
      [featureName]: {
        ...prev[featureName],
        paths: prev[featureName].paths.filter((_, i) => i !== index),
      },
    }));
  }

  function removeService(name: string) {
    setServices((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function removePage(name: string) {
    setPages((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function handleReset() {
    setFeatures(config.features);
    setServices(config.services);
    setPages(config.pages);
    setIgnorePatterns(config.ignorePatterns);
    setJson(JSON.stringify(config, null, 2));
  }

  function renderInlineInput(placeholder: string) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInlineKeyDown}
          onBlur={handleInlineSubmit}
          placeholder={placeholder}
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button
          onClick={handleInlineSubmit}
          className="text-xs text-[var(--color-accent)] hover:underline"
        >
          Ekle
        </button>
        <button
          onClick={() => { setInlineInput(null); setInputValue(""); }}
          className="text-xs text-[var(--color-text-muted)] hover:underline"
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Yapılandırma Editörü</h3>
        <button
          onClick={handleModeToggle}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          {rawMode ? "Yapisal Mod" : "Ham JSON"}
        </button>
      </div>

      {rawMode ? (
        <div>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={20}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          {parseError && (
            <p className="mt-2 text-sm text-[var(--color-danger)]">{parseError}</p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleRawSave}
              disabled={saving}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Sıfırla
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Features */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-[var(--color-text-primary)]">Özellikler</h4>
              {inlineInput?.type === "feature" ? null : (
                <button
                  onClick={() => { setInlineInput({ type: "feature" }); setInputValue(""); }}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  + Ekle
                </button>
              )}
            </div>
            {inlineInput?.type === "feature" && renderInlineInput("Özellik adı...")}
            {Object.entries(features).map(([name, mapping]) => (
              <div key={name} className="mb-3 rounded border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text-primary)]">{name}</span>
                  <button
                    onClick={() => removeFeature(name)}
                    className="text-xs text-[var(--color-danger)] hover:underline"
                  >
                    Sil
                  </button>
                </div>
                <input
                  value={mapping.description}
                  onChange={(e) =>
                    setFeatures((prev) => ({
                      ...prev,
                      [name]: { ...prev[name], description: e.target.value },
                    }))
                  }
                  placeholder="Açıklama"
                  className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
                />
                <div className="mt-2">
                  <span className="text-xs text-[var(--color-text-muted)]">Dosya Yollari:</span>
                  {mapping.paths.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 text-sm">
                      <code className="flex-1 rounded bg-[var(--color-bg-tertiary)] px-1 text-[var(--color-text-primary)]">{p}</code>
                      <button
                        onClick={() => removePathFromFeature(name, i)}
                        className="text-xs text-[var(--color-danger)]"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {inlineInput?.type === "path" && inlineInput.parentKey === name
                    ? renderInlineInput("Dosya deseni (glob)...")
                    : (
                      <button
                        onClick={() => { setInlineInput({ type: "path", parentKey: name }); setInputValue(""); }}
                        className="mt-1 text-xs text-[var(--color-accent)] hover:underline"
                      >
                        + Yol Ekle
                      </button>
                    )}
                </div>
              </div>
            ))}
          </section>

          {/* Services */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-[var(--color-text-primary)]">Servisler</h4>
              {inlineInput?.type === "service" ? null : (
                <button
                  onClick={() => { setInlineInput({ type: "service" }); setInputValue(""); }}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  + Ekle
                </button>
              )}
            </div>
            {inlineInput?.type === "service" && renderInlineInput("Servis adi...")}
            {Object.entries(services).map(([name, patterns]) => (
              <div key={name} className="mb-2 flex items-center justify-between rounded border border-[var(--color-border)] p-2">
                <div>
                  <span className="font-medium text-sm text-[var(--color-text-primary)]">{name}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {patterns.length} desen
                  </span>
                </div>
                <button
                  onClick={() => removeService(name)}
                  className="text-xs text-[var(--color-danger)] hover:underline"
                >
                  Sil
                </button>
              </div>
            ))}
          </section>

          {/* Pages */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-[var(--color-text-primary)]">Sayfalar</h4>
              {inlineInput?.type === "page" ? null : (
                <button
                  onClick={() => { setInlineInput({ type: "page" }); setInputValue(""); }}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  + Ekle
                </button>
              )}
            </div>
            {inlineInput?.type === "page" && renderInlineInput("Sayfa adi...")}
            {Object.entries(pages).map(([name, patterns]) => (
              <div key={name} className="mb-2 flex items-center justify-between rounded border border-[var(--color-border)] p-2">
                <div>
                  <span className="font-medium text-sm text-[var(--color-text-primary)]">{name}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {patterns.length} desen
                  </span>
                </div>
                <button
                  onClick={() => removePage(name)}
                  className="text-xs text-[var(--color-danger)] hover:underline"
                >
                  Sil
                </button>
              </div>
            ))}
          </section>

          {/* Ignore Patterns */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-[var(--color-text-primary)]">Yok Sayılacak Desenler</h4>
              {inlineInput?.type === "pattern" ? null : (
                <button
                  onClick={() => { setInlineInput({ type: "pattern" }); setInputValue(""); }}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  + Ekle
                </button>
              )}
            </div>
            {inlineInput?.type === "pattern" && renderInlineInput("Yoksayma deseni (glob)...")}
            <div className="space-y-1">
              {ignorePatterns.map((p, i) => (
                <div key={i} className="flex items-center gap-1 text-sm">
                  <code className="flex-1 rounded bg-[var(--color-bg-tertiary)] px-1 text-[var(--color-text-primary)]">{p}</code>
                  <button
                    onClick={() =>
                      setIgnorePatterns((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-xs text-[var(--color-danger)]"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-3">
            <button
              onClick={handleStructuredSave}
              disabled={saving}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              Sıfırla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
