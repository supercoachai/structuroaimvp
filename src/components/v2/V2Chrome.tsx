"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import {
  IconShutdown,
  IconSun,
  IconTarget,
  IconTasks,
} from "@/components/navigation/mainAppNav";

import { v2ScopedCss, v2Styles } from "./theme";

function IconDump({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M8 7h8" />
      <path d="M5 21h14" />
      <path d="M9 17h6" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/** Pagina-omhulsel: prikkelarme achtergrond, een kolom, gedeelde CSS. */
export function V2Page({ children }: { children: ReactNode }) {
  return (
    <main className="v2-page" style={v2Styles.pageScroll}>
      <style>{v2ScopedCss}</style>
      <div className="v2-shell" style={v2Styles.shell}>
        {children}
      </div>
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
 * de sage-accentkleur (nooit een gevulde knop). "Dagafsluiting" opent het
 * shutdown-ritueel op /v2/shutdown.
 */
function V2BottomNav() {
  const pathname = usePathname();

  const tabs: {
    id: string;
    href?: string;
    label: string;
    Icon: (props: { className?: string }) => ReactNode;
    onClick?: () => void;
  }[] = [
    { id: "home", href: "/v2/home", label: "Start", Icon: IconSun },
    { id: "dump", href: "/v2/dump", label: "Dump", Icon: IconDump },
    { id: "taken", href: "/v2/todo", label: "Taken", Icon: IconTasks },
    { id: "focus", href: "/v2/focus", label: "Focus", Icon: IconTarget },
    {
      id: "shutdown",
      href: "/v2/shutdown",
      label: "Dagafsluiting",
      Icon: IconShutdown,
    },
  ];

  return (
    <nav style={v2Styles.appNav} aria-label="v2 navigatie">
      {tabs.map((tab) => {
        const active = tab.href ? isActiveTab(pathname, tab.href) : false;
        const itemStyle: CSSProperties = {
          ...v2Styles.appNavItem,
          color: active ? "var(--accent)" : "var(--text-muted)",
        };
        const Icon = tab.Icon;
        const inner = (
          <>
            <span style={v2Styles.appNavIcon}>
              <Icon />
            </span>
            <span style={v2Styles.appNavLabel}>{tab.label}</span>
          </>
        );
        if (tab.href) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              style={itemStyle}
              aria-current={active ? "page" : undefined}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button key={tab.id} type="button" onClick={tab.onClick} style={itemStyle}>
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
  bottomSlot,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Soft-prompt boven de bottom-nav (bijv. avondwolkje), buiten de scroll. */
  bottomSlot?: ReactNode;
}) {
  const pathname = usePathname();
  const onSettings = isActiveTab(pathname, "/v2/settings");

  return (
    <>
      <style>{v2ScopedCss}</style>
      <div style={v2Styles.appPage}>
        <header
          style={{
            ...v2Styles.appHeader,
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <Link href="/v2" style={v2Styles.appShellBrand}>
            <img
              src="/logo-structuro.png"
              alt=""
              style={v2Styles.appShellLogo}
              width={28}
              height={28}
            />
            <span style={v2Styles.appShellWordmark}>Structuro</span>
            <span style={v2Styles.appShellBadge}>v2 test</span>
          </Link>
          <div style={v2Styles.appHeaderActions}>
            <Link
              href="/v2/settings"
              className="v2-headerlink"
              style={{
                ...v2Styles.appHeaderLink,
                ...(onSettings ? v2Styles.appHeaderLinkActive : {}),
              }}
              aria-label="Instellingen"
              aria-current={onSettings ? "page" : undefined}
            >
              <IconSettings />
              <span>Instellingen</span>
            </Link>
            <Link href="/v2" className="v2-headerlink" style={v2Styles.appHeaderLink}>
              Sluiten
            </Link>
          </div>
        </header>

        <main style={scroll ? v2Styles.appMainScroll : v2Styles.appMainFixed}>
          {children}
        </main>

        {bottomSlot ? (
          <div className="v2-shell-bottom-slot" style={v2Styles.appBottomSlot}>
            {bottomSlot}
          </div>
        ) : null}

        <V2BottomNav />
      </div>
    </>
  );
}

/**
 * Eerlijke voortgang: "stap x van y". Nooit een blokkerende timer.
 * Toont altijd dat stoppen kan zonder verlies (geruststellende toon).
 */
export function V2Progress({
  step,
  total,
  showReassurance = true,
}: {
  step: number;
  total: number;
  /** Standaard bij de balk; dagstart zet dit uit en toont V2Reassurance onder het vak. */
  showReassurance?: boolean;
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
        {showReassurance ? (
          <span style={v2Styles.progressHint}>
            {" "}
            Stoppen kan altijd, er gaat niets verloren.
          </span>
        ) : null}
      </p>
    </>
  );
}

/** Geruststellende regel onder het witte vak (niet in de voortgangsbalk). */
export function V2Reassurance({
  children = "Stoppen kan altijd, er gaat niets verloren.",
}: {
  children?: ReactNode;
}) {
  return <p style={v2Styles.reassuranceBelow}>{children}</p>;
}
