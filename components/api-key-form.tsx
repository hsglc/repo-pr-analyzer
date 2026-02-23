"use client";

import { useState } from "react";
import { toast } from "sonner";

export function ApiKeyForm({
  defaultProvider,
  onSaved,
}: {
  defaultProvider: string;
  onSaved: () => void;
}) {
  const [githubToken, setGithubToken] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState(defaultProvider);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body: Record<string, string> = {
        githubToken,
        aiProvider,
      };
      if (claudeApiKey) body.claudeApiKey = claudeApiKey;
      if (openaiApiKey) body.openaiApiKey = openaiApiKey;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Kaydedilemedi");
      } else {
        toast.success("Başarıyla kaydedildi!");
        setGithubToken("");
        setClaudeApiKey("");
        setOpenaiApiKey("");
        onSaved();
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-[var(--color-text-primary)]">API Anahtarlarını Güncelle</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="github-token" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            GitHub Token <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="github-token"
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            required
            placeholder="ghp_..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="ai-provider" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">AI Sağlayıcı</label>
          <select
            id="ai-provider"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        {aiProvider === "claude" && (
          <div>
            <label htmlFor="claude-key" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
              Claude API Key
            </label>
            <input
              id="claude-key"
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
        )}

        {aiProvider === "openai" && (
          <div>
            <label htmlFor="openai-key" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
              OpenAI API Key
            </label>
            <input
              id="openai-key"
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
