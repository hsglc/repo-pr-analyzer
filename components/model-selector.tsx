"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { getModelsForProvider, getDefaultModel, type ModelInfo } from "@/lib/core/providers/models";

interface ModelSelectorProps {
  onModelChange: (model: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [provider, setProvider] = useState<string>("claude");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProvider() {
      try {
        const res = await authFetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const p = data.aiProvider || "claude";
          setProvider(p);
          const providerModels = getModelsForProvider(p);
          setModels(providerModels);
          const defaultModel = getDefaultModel(p);
          setSelected(defaultModel);
          onModelChange(defaultModel);
        }
      } catch {
        // Fall back to defaults
        const providerModels = getModelsForProvider("claude");
        setModels(providerModels);
        const defaultModel = getDefaultModel("claude");
        setSelected(defaultModel);
        onModelChange(defaultModel);
      }
      setLoading(false);
    }
    loadProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(model: string) {
    setSelected(model);
    onModelChange(model);
  }

  if (loading) {
    return (
      <div className="animate-shimmer h-9 w-48 rounded-lg" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-[var(--color-text-muted)]">Model:</label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-[var(--color-text-muted)] capitalize">{provider}</span>
    </div>
  );
}
