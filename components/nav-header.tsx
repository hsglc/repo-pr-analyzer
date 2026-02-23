"use client";

import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "./sidebar-context";
import { DarkModeToggle } from "./dark-mode-toggle";

export function NavHeader() {
  const { data: session } = useSession();
  const { toggle } = useSidebar();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-lg p-2 hover:bg-[var(--color-bg-tertiary)] md:hidden"
          aria-label="Menu ac/kapat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold">PR Etki Analizci</h1>
      </div>
      <div className="flex items-center gap-3">
        <DarkModeToggle />
        <span className="text-sm text-[var(--color-text-muted)]">{session?.user?.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          Cikis Yap
        </button>
      </div>
    </header>
  );
}
