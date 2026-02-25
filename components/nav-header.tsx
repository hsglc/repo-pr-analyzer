"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSidebar } from "./sidebar-context";

export function NavHeader() {
  const { toggle } = useSidebar();
  const pathname = usePathname();

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 sm:h-16 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          onClick={toggle}
          className="shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors md:hidden"
          aria-label="Menu ac/kapat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Breadcrumb */}
        <nav className="flex min-w-0 items-center gap-1 text-sm sm:gap-1.5" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex min-w-0 items-center gap-1 sm:gap-1.5">
              {i > 0 && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]/50">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="truncate font-semibold text-[var(--color-text-primary)]">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="shrink-0 whitespace-nowrap text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          onClick={() => signOut(auth).then(() => window.location.href = "/login")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-danger-light)] hover:text-[var(--color-danger)] transition-colors sm:px-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="hidden sm:inline">Cikis Yap</span>
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
