"use client";

import Image from "next/image";
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

/** 112×81 mark (~9KB) i.p.v. 1024×740 /logo-structuro.png (~502KB). */
const V2_LOGO_SRC = "/v2/logo-mark.png";

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

/** Merkregel: logo + wordmark, in de website-huisstijl. */
function V2Brand() {
  return (
    <Link href="/v2" style={v2Styles.wordmark}>
      <span style={v2Styles.brandRow}>
        <Image
          src={V2_LOGO_SRC}
          alt=""
          width={22}
          height={16}
          style={v2Styles.brandLogo}
          priority
        />
        Structuro
      </span>
    </Link>
  );
}

/**
 * Flow-header (design phone): Terug | STRUCTURO | Stoppen.
 * brandMode="flow" = uppercase tracked text, geen logo/badge.
 */
export function V2Header({
  exitHref,
  exitLabel = "Stoppen",
  onBack,
  brandMode = "default",
}: {
  exitHref?: string;
  exitLabel?: string;
  /** Toont "< Terug" links; alleen op stappen na welcome. */
  onBack?: () => void;
  /** "flow" = design-phone woordmerk gecentreerd. */
  brandMode?: "default" | "flow";
}) {
  if (brandMode === "flow") {
    return (
      <header className="v2-flow-header">
        {onBack ? (
          <button type="button" className="v2-flow-header__side" onClick={onBack}>
            {"< Terug"}
          </button>
        ) : (
          <span className="v2-flow-header__side" aria-hidden="true" />
        )}
        <p className="v2-flow-header__brand">Structuro</p>
        {exitHref ? (
          <Link href={exitHref} className="v2-flow-header__side v2-flow-header__exit">
            {exitLabel}
          </Link>
        ) : (
          <span className="v2-flow-header__side" aria-hidden="true" />
        )}
      </header>
    );
  }

  return (
    <header style={v2Styles.header}>
      <V2Brand />
      {exitHref ? (
        <Link
          href={exitHref}
          className="v2-textlink"
          style={{ ...v2Styles.textlink, opacity: 0.42 }}
        >
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
      label: "Afsluiten",
      Icon: IconShutdown,
    },
  ];

  return (
    <nav style={v2Styles.appNav} aria-label="v2 navigatie">
      {tabs.map((tab) => {
        const active = tab.href ? isActiveTab(pathname, tab.href) : false;
        const itemStyle: CSSProperties = {
          ...v2Styles.appNavItem,
          ...(active ? v2Styles.appNavItemActive : {}),
          color: active ? "var(--accent)" : "var(--text-muted)",
          opacity: active ? 1 : 0.48,
        };
        const Icon = tab.Icon;
        const inner = (
          <>
            <span style={v2Styles.appNavIcon}>
              <Icon />
            </span>
            {/* Alleen actieve tab toont label: 5 gelijke labels = cognitieve tax. */}
            {active ? (
              <span style={v2Styles.appNavLabel}>{tab.label}</span>
            ) : (
              <span className="sr-only">{tab.label}</span>
            )}
          </>
        );
        if (tab.href) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              style={itemStyle}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              title={tab.label}
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
            style={itemStyle}
            aria-label={tab.label}
            title={tab.label}
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
  bottomSlot,
  /** Dunne 5-tab nav: iconen + alleen actief label. */
  showBottomNav = true,
  /** "flow" = design-phone: Home | STRUCTURO (geen logo/settings). */
  chrome = "app",
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Soft-prompt boven de bottom-nav (bijv. avondwolkje), buiten de scroll. */
  bottomSlot?: ReactNode;
  showBottomNav?: boolean;
  chrome?: "app" | "flow";
}) {
  const pathname = usePathname();
  const onSettings = isActiveTab(pathname, "/v2/settings");
  const headerPad = {
    paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
    paddingLeft: 24,
    paddingRight: 24,
  } as const;

  return (
    <>
      <style>{v2ScopedCss}</style>
      <div style={v2Styles.appPage}>
        {chrome === "flow" ? (
          <header className="v2-flow-header" style={headerPad}>
            <Link href="/v2/home" className="v2-flow-header__side">
              {"< Home"}
            </Link>
            <p className="v2-flow-header__brand">Structuro</p>
            <span className="v2-flow-header__side" aria-hidden="true" />
          </header>
        ) : (
          <header
            style={{
              ...v2Styles.appHeader,
              ...headerPad,
            }}
          >
            <Link href="/v2" style={v2Styles.appShellBrand}>
              <Image
                src={V2_LOGO_SRC}
                alt=""
                width={28}
                height={20}
                style={v2Styles.appShellLogo}
                priority
              />
              <span style={v2Styles.appShellWordmark}>Structuro</span>
            </Link>
            <div style={v2Styles.appHeaderActions}>
              {onSettings ? (
                <Link
                  href="/v2/home"
                  className="v2-headerlink"
                  style={v2Styles.appHeaderLink}
                  aria-label="Terug"
                >
                  <span>{"< Terug"}</span>
                </Link>
              ) : (
                <Link
                  href="/v2/settings"
                  className="v2-headerlink v2-headerlink--icon"
                  style={v2Styles.appHeaderLink}
                  aria-label="Instellingen"
                  title="Instellingen"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.55"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>
              )}
            </div>
          </header>
        )}

        <main style={scroll ? v2Styles.appMainScroll : v2Styles.appMainFixed}>
          {children}
        </main>

        {bottomSlot ? (
          <div className="v2-shell-bottom-slot" style={v2Styles.appBottomSlot}>
            {bottomSlot}
          </div>
        ) : null}

        {showBottomNav ? <V2BottomNav /> : null}
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
