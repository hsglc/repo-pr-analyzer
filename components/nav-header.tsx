"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSidebar } from "./sidebar-context";

export function NavHeader() {
  const { toggle } = useSidebar();
  const pathname = usePathname();

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-lg p-2 hover:bg-[var(--color-bg-tertiary)] md:hidden"
          aria-label="Menü aç/kapat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-[var(--color-text-primary)]">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Çıkış Yap
        </button>
      </div>
    </header>
  );
}

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);

  // Always start with Panel
  crumbs.push({ label: "Panel", href: "/dashboard" });

  if (segments.length <= 1) return crumbs;

  // /dashboard/[owner]/[repo]/pulls
  if (segments.length >= 4 && segments[0] === "dashboard") {
    const owner = segments[1];
    const repo = segments[2];
    crumbs.push({
      label: `${owner}/${repo}`,
      href: `/dashboard/${owner}/${repo}/pulls`,
    });

    // /dashboard/[owner]/[repo]/pulls/[number]
    if (segments.length >= 5 && segments[3] === "pulls" && segments[4]) {
      crumbs.push({
        label: `PR #${segments[4]}`,
        href: `/dashboard/${owner}/${repo}/pulls/${segments[4]}`,
      });
    }
  }

  // /settings
  if (segments[0] === "settings") {
    crumbs[0] = { label: "Panel", href: "/dashboard" };
    crumbs.push({ label: "Ayarlar", href: "/settings" });

    if (segments.length >= 4 && segments[1] === "configs") {
      crumbs.push({
        label: `${segments[2]}/${segments[3]}`,
        href: `/settings/configs/${segments[2]}/${segments[3]}`,
      });
    }
  }

  return crumbs;
}
