"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  IconShutdown,
  IconSun,
  IconTarget,
  IconTasks,
} from "@/components/navigation/mainAppNav";
import { v2ScopedCss, v2Styles } from "./theme";
import { useV2Go } from "./v2nav";

/** Pagina-omhulsel: prikkelarme achtergrond, een kolom, gedeelde CSS. */
export function V2Page({ children }: { children: ReactNode }) {
  return (
    <main style={v2Styles.page}>
      <style>{v2ScopedCss}</style>
      <div style={v2Styles.shell}>{children}</div>
    </main>
  );
}

/** Merkregel: logo + wordmark + testbadge, in de website-huisstijl. */
function V2Brand() {
  return (
    <Link href="/v2" style={v2Styles.wordmark}>
      <span style={v2Styles.brandRow}>
        <img src="/logo-structuro.png" alt="" style={v2Styles.brandLogo} />
        Structuro
        <span style={v2Styles.badge}>v2 test</span>
      </span>
    </Link>
  );
}

/** Kop met wordmark + testbadge. Optioneel een rustige uitgang (geen shame). */
export function V2Header({
  exitHref,
  exitLabel = "Stoppen",
}: {
  exitHref?: string;
  exitLabel?: string;
}) {
  return (
    <header style={v2Styles.header}>
      <V2Brand />
      {exitHref ? (
        <Link href={exitHref} className="v2-textlink" style={v2Styles.textlink}>
          {exitLabel}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </header>
  );
}

/** Editoriale eyebrow met zacht pulserende stip, zoals op de website. */
export function V2Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p style={v2Styles.eyebrow}>
      <span className="v2-eyebrow-dot" style={v2Styles.eyebrowDot} aria-hidden="true" />
      {children}
    </p>
  );
}

function isActiveTab(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * v2 bottom-nav in Variant F: cream papier, rustige iconen. Active-tab krijgt
 * de sage-accentkleur (nooit een gevulde knop). "Dagafsluiting" voert
 * shutdown-light uit (tik klaar voor vandaag), geen aparte route.
 */
function V2BottomNav() {
  const pathname = usePathname();
  const go = useV2Go();

  const tabs: {
    id: string;
    href?: string;
    label: string;
    Icon: (props: { className?: string }) => ReactNode;
    onClick?: () => void;
  }[] = [
    { id: "home", href: "/v2/home", label: "Start", Icon: IconSun },
    { id: "taken", href: "/v2/todo", label: "Taken", Icon: IconTasks },
    { id: "focus", href: "/v2/focus", label: "Focus", Icon: IconTarget },
    {
      id: "shutdown",
      label: "Dagafsluiting",
      Icon: IconShutdown,
      onClick: () => go("/v2/home", { todayDone: true }),
    },
  ];

  return (
    <nav
      className="grid shrink-0 grid-cols-4 px-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      aria-label="v2 navigatie"
    >
      {tabs.map((tab) => {
        const active = tab.href ? isActiveTab(pathname, tab.href) : false;
        const color = active ? "var(--accent)" : "var(--text-muted)";
        const Icon = tab.Icon;
        const inner = (
          <>
            <Icon className="shrink-0" />
            <span className="w-full text-center text-[10px] font-semibold leading-[1.15] tracking-wide">
              {tab.label}
            </span>
          </>
        );
        const className =
          "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1";
        if (tab.href) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={className}
              style={{ color }}
              aria-current={active ? "page" : undefined}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`${className} border-0 bg-transparent`}
            style={{ color }}
          >
            {inner}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * v2 app-shell in Variant F: warm papier (--surface), serif wordmark, één
 * rustige tekst-uitgang (geen gevulde knop in de chrome), en de F-bottom-nav.
 * Bewust GEEN echte AppLayout/DagstartOverlay/auth: alles draait zelfstandig op
 * lokale state, zodat de gate-bypass intact blijft.
 */
export function V2AppShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      className="flex h-[100dvh] w-full flex-col"
      style={{ background: "var(--surface)", color: "var(--text)" }}
    >
      <header
        className="flex w-full shrink-0 items-center justify-between gap-3 px-6 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/v2" className="flex min-w-0 items-center gap-2" style={{ textDecoration: "none" }}>
          <img
            src="/logo-structuro.png"
            alt=""
            className="h-7 w-7 shrink-0 object-contain"
            width={28}
            height={28}
          />
          <span
            className="truncate"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            Structuro
          </span>
          <span
            className="ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
          >
            v2
          </span>
        </Link>
        <Link href="/v2" className="v2-link">
          Sluiten
        </Link>
      </header>

      <main
        className={
          scroll
            ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        {children}
      </main>

      <V2BottomNav />
    </div>
  );
}

/**
 * Eerlijke voortgang: "stap x van y". Nooit een blokkerende timer.
 * Toont altijd dat stoppen kan zonder verlies (geruststellende toon).
 */
export function V2Progress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <>
      <div style={v2Styles.progressWrap} aria-hidden="true">
        <div style={v2Styles.progressTrack}>
          <div
            className="v2-progress-fill"
            style={{ ...v2Styles.progressFill, width: `${pct}%` }}
          />
        </div>
      </div>
      <p style={v2Styles.progressLabel}>
        Stap {step} van {total}
        <span style={v2Styles.progressHint}>
          {" "}
          Stoppen kan altijd, er gaat niets verloren.
        </span>
      </p>
    </>
  );
}
