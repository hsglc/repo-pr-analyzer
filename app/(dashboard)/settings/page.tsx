"use client";

import { useEffect, useState } from "react";
import { ApiKeyForm } from "@/components/api-key-form";
import { SettingsSkeleton } from "@/components/skeletons";
import { authFetch } from "@/lib/api-client";

interface KeyStatus {
  hasGithubToken: boolean;
  hasClaudeApiKey: boolean;
  hasOpenaiApiKey: boolean;
  aiProvider: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    try {
      const res = await authFetch("/api/settings");
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Silently fail, status will remain null
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h2 className="mb-6 text-2xl font-bold text-[var(--color-text-primary)]">API Ayarları</h2>

      {status && (
        <div className="mb-6 rounded-lg bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-[var(--color-text-primary)]">Mevcut Durum</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.hasGithubToken ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
                }`}
              />
              <span className="text-[var(--color-text-secondary)]">
                GitHub Token: {status.hasGithubToken ? "Kayıtlı" : "Yok"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.hasClaudeApiKey ? "bg-[var(--color-success)]" : "bg-[var(--color-bg-tertiary)]"
                }`}
              />
              <span className="text-[var(--color-text-secondary)]">
                Claude API Key: {status.hasClaudeApiKey ? "Kayıtlı" : "Yok"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status.hasOpenaiApiKey ? "bg-[var(--color-success)]" : "bg-[var(--color-bg-tertiary)]"
                }`}
              />
              <span className="text-[var(--color-text-secondary)]">
                OpenAI API Key: {status.hasOpenaiApiKey ? "Kayıtlı" : "Yok"}
              </span>
            </div>
            <div className="text-[var(--color-text-muted)]">
              AI Sağlayıcı: {status.aiProvider}
            </div>
          </div>
        </div>
      )}

      <ApiKeyForm
        defaultProvider={status?.aiProvider ?? "claude"}
        onSaved={loadStatus}
      />
    </div>
  );
}
