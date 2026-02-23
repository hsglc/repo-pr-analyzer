"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kayıt sırasında hata oluştu");
        setLoading(false);
        return;
      }

      // If id is present, registration succeeded -> auto-login
      if (data.id) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        setLoading(false);

        if (result?.error) {
          router.push("/login");
        } else {
          router.push("/settings");
        }
      } else {
        // User already exists or generic success -> redirect to login
        setLoading(false);
        router.push("/login");
      }
    } catch {
      setLoading(false);
      setError("Bir hata oluştu");
    }
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold text-[var(--color-text-primary)]">Kayıt Ol</h1>

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
            minLength={8}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
            Şifre Tekrar
          </label>
          <input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline">
          Giriş Yap
        </Link>
      </p>
    </>
  );
}
