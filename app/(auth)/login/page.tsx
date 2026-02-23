"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email veya şifre hatalı");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold text-[var(--color-text-primary)]">Giriş Yap</h1>

      {error && (
        <div className="mb-4 rounded-lg p-3 text-sm" style={{ backgroundColor: "var(--color-danger-light)", color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Şifre
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
        Hesabınız yok mu?{" "}
        <Link href="/register" className="text-[var(--color-accent)] hover:underline">
          Kayıt Ol
        </Link>
      </p>
    </>
  );
}
