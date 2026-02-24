"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>
      {/* Floating orbs */}
      <div className="auth-orb hidden sm:block" style={{ width: 400, height: 400, top: "5%", left: "10%", background: "#3b82f6" }} />
      <div className="auth-orb hidden sm:block" style={{ width: 350, height: 350, bottom: "10%", right: "5%", background: "#7c3aed", animationDelay: "2s" }} />
      <div className="auth-orb hidden sm:block" style={{ width: 250, height: 250, top: "60%", left: "50%", background: "#ec4899", animationDelay: "4s", opacity: 0.15 }} />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            PIA
          </span>
          <span className="text-sm text-slate-400">PR Impact Analyzer</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors sm:px-4"
          >
            Giris Yap
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-all active:scale-95 sm:px-4"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            Kayit Ol
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 md:pt-20 md:pb-16 lg:pt-32">
        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-6xl animate-fade-in">
          PR Degisikliklerini{" "}
          <span
            className="animate-gradient-text"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Aninda Analiz Edin
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          AI destekli etki analizi, otomatik test senaryolari ve kod inceleme ile
          pull request&apos;lerinizi daha hizli ve guvenli bir sekilde inceleyin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Link
            href="/register"
            className="btn-glow rounded-xl px-8 py-3 text-base font-semibold text-white active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            Ucretsiz Basla
          </Link>
          <Link
            href="/login"
            className="glass rounded-xl px-8 py-3 text-base font-semibold text-white hover:bg-white/15 active:scale-95 transition-all"
          >
            Giris Yap
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-white md:mb-12">Ozellikler</h2>
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 stagger-children">
          {/* PR Analizi */}
          <div className="glass rounded-2xl p-6 card-hover">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3"/>
                <circle cx="6" cy="6" r="3"/>
                <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                <line x1="6" y1="9" x2="6" y2="21"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">PR Analizi</h3>
            <p className="text-sm text-slate-400">
              Pull request degisikliklerinizi AI ile analiz edin, etkilenen ozellikleri ve risk seviyesini gorun.
            </p>
          </div>

          {/* Kod Inceleme */}
          <div className="glass rounded-2xl p-6 card-hover">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 6 4 14"/>
                <path d="M12 6v14"/>
                <path d="M8 8v12"/>
                <path d="M4 4v16"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Kod Inceleme</h3>
            <p className="text-sm text-slate-400">
              Guvenlik aciklari, performans sorunlari ve kod kalitesi bulgulerini otomatik olarak tespit edin.
            </p>
          </div>

          {/* Branch Karsilastirma */}
          <div className="glass rounded-2xl p-6 card-hover">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"/>
                <circle cx="18" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/>
                <path d="M18 9a9 9 0 0 1-9 9"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Branch Karsilastirma</h3>
            <p className="text-sm text-slate-400">
              Iki branch arasindaki farklari analiz edin, merge oncesi potansiyel sorunlari tespit edin.
            </p>
          </div>

          {/* Test Senaryolari */}
          <div className="glass rounded-2xl p-6 card-hover">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Test Senaryolari</h3>
            <p className="text-sm text-slate-400">
              Degisikliklerinize ozel AI tarafindan olusturulan test senaryolariyla kapsamli test yapin.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <h2 className="mb-12 text-center text-2xl font-bold text-white">Nasil Calisir?</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
              1
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">API Anahtarlarinizi Ekleyin</h3>
            <p className="text-sm text-slate-400">GitHub token ve AI API anahtarinizi guvenli bir sekilde kaydedin.</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
              2
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Repo ve PR Secin</h3>
            <p className="text-sm text-slate-400">GitHub repolarinizdan analiz etmek istediginiz PR&apos;i secin.</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #ec4899, #f59e0b)" }}>
              3
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">Analiz Sonuclarini Gorun</h3>
            <p className="text-sm text-slate-400">Etki analizi, test senaryolari ve kod inceleme sonuclarini elde edin.</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 md:py-16">
        <div className="glass rounded-3xl p-6 sm:p-10">
          <h2 className="mb-4 text-2xl font-bold text-white">Hemen Baslayin</h2>
          <p className="mb-8 text-slate-400">
            PR analizinizi AI ile guclandirin. Ucretsiz hesap olusturun.
          </p>
          <Link
            href="/register"
            className="btn-glow inline-block rounded-xl px-10 py-3 text-base font-semibold text-white active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            Ucretsiz Kayit Ol
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="text-sm text-slate-500">PR Impact Analyzer</p>
      </footer>
    </div>
  );
}
