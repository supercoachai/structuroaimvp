import Link from "next/link";
import type { ReactNode } from "react";

const SITE_HREF = "https://www.structuro.eu";
const START_HREF =
  "/onboarding?utm_source=structuro_eu&utm_medium=organic&utm_campaign=blog";

export function BlogChrome({ children }: { children: ReactNode }) {
  return (
    <div className="st-story-bg min-h-full text-[var(--story-text)]">
      <header className="border-b border-[var(--story-border)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href={SITE_HREF}
            className="st-story-serif text-lg font-semibold tracking-tight"
          >
            Structuro
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="text-[var(--story-text-muted)]">
              Blog
            </Link>
            <Link
              href={START_HREF}
              className="rounded-full bg-[var(--story-cta)] px-4 py-2 font-medium text-[var(--story-text-on-navy)]"
            >
              Start gratis
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10">{children}</main>
      <footer className="border-t border-[var(--story-border)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-[var(--story-text-muted)]">
          <Link href={SITE_HREF}>structuro.eu</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Voorwaarden</Link>
        </div>
      </footer>
    </div>
  );
}
