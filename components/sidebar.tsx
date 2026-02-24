"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useSession } from "next-auth/react";

const navItems = [
  {
    href: "/dashboard",
    label: "Panel",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Ayarlar",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const { data: session } = useSession();

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-4">
          <div>
            <span
              className="text-xl font-bold"
              style={{
                background: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              PIA
            </span>
            <span className="ml-2 text-xs text-[var(--color-text-muted)]">PR Impact Analyzer</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3" aria-label="Ana menu">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent-text)] pl-[10px]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:translate-x-0.5"
                }`}
              >
                <span className={active ? "text-[var(--color-accent)]" : ""}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: Dark mode + User */}
        <div className="border-t border-[var(--color-border)] p-3 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-[var(--color-text-muted)]">Tema</span>
            <DarkModeToggle />
          </div>
          {session?.user && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-medium text-white">
                {session.user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="truncate text-xs text-[var(--color-text-secondary)]">
                {session.user.email}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
