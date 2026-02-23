"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ConfigEditor } from "@/components/config-editor";
import { ConfigSkeleton } from "@/components/skeletons";
import type { ImpactMapConfig } from "@/lib/core/types";

export default function ConfigPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const [config, setConfig] = useState<ImpactMapConfig | null>(null);
  const [source, setSource] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/configs/${params.owner}/${params.repo}`
        );
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
          setSource(data.source);
        } else {
          toast.error("Config yuklenirken hata olustu");
        }
      } catch {
        toast.error("Config yuklenirken beklenmeyen bir hata olustu");
      }
      setLoading(false);
    }
    load();
  }, [params.owner, params.repo]);

  async function handleSave(updated: ImpactMapConfig) {
    setSaving(true);

    try {
      const res = await fetch(
        `/api/configs/${params.owner}/${params.repo}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: updated }),
        }
      );

      if (res.ok) {
        setConfig(updated);
        setSource("database");
        toast.success("Config basariyla kaydedildi");
      } else {
        toast.error("Config kaydedilirken hata olustu");
      }
    } catch {
      toast.error("Config kaydedilirken beklenmeyen bir hata olustu");
    }
    setSaving(false);
  }

  async function handleAutoDetect() {
    setDetecting(true);
    try {
      const res = await fetch(
        `/api/configs/${params.owner}/${params.repo}`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setSource("auto-detected");
        toast.success("Config otomatik olarak tespit edildi");
      } else {
        const data = await res.json();
        toast.error(data.error || "Otomatik tespit basarisiz");
      }
    } catch {
      toast.error("Otomatik tespit sirasinda hata olustu");
    }
    setDetecting(false);
  }

  if (loading) {
    return <ConfigSkeleton />;
  }

  const sourceLabels: Record<string, string> = {
    repo: "Repo (impact-map.config.json)",
    database: "Veritabani",
    default: "Varsayilan",
    "auto-detected": "Otomatik Tespit",
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          &larr; Panel
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {params.owner}/{params.repo} - Etki Haritasi Yapilandirmasi
          </h2>
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
          >
            {detecting ? "Tespit ediliyor..." : "Otomatik Tespit Et"}
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Kaynak: {sourceLabels[source] || source}
        </p>
      </div>

      {config && (
        <ConfigEditor
          config={config}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
