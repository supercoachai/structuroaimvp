"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import {
  IconShutdown,
  IconSun,
  IconTarget,
  IconTasks,
} from "@/components/navigation/mainAppNav";
import { HAPTIC_PATTERNS, triggerHaptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { performClientLogout } from "@/lib/logoutClient";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";

import { v2ScopedCss, v2Styles } from "./theme";

/** 112×81 mark (~9KB) i.p.v. 1024×740 /logo-structuro.png (~502KB). */
const V2_LOGO_SRC = "/v2/logo-mark.png";

/** Tray + pijl omlaag: gedachten eruit, in extern geheugen. Rustig, geen ±. */
function IconDump({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 21h14" />
      <path d="M7 17v4" />
      <path d="M17 17v4" />
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

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Interne Next-link of externe marketing-URL (zelfde tab). */
function V2ExitLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

/**
 * Flow-header: Stoppen (of Terug) | STRUCTURO | trailing (bijv. taalvlaggen).
 * brandMode="flow" = uppercase tracked text, geen logo/badge.
 * Zonder terug: exit links. Met terug: Terug links, exit rechts (tenzij trailing).
 */
export function V2Header({
  exitHref,
  exitLabel = "Stoppen",
  onBack,
  trailing,
  brandMode = "default",
}: {
  exitHref?: string;
  exitLabel?: string;
  /** Toont "< Terug" links wanneer er een vorige stap is. */
  onBack?: () => void;
  /** Rechtsboven in flow-header (bijv. NL/EN-vlaggen op energy). */
  trailing?: ReactNode;
  /** "flow" = design-phone woordmerk gecentreerd. */
  brandMode?: "default" | "flow";
}) {
  if (brandMode === "flow") {
    const left = onBack ? (
      <button type="button" className="v2-flow-header__side" onClick={onBack}>
        {"< Terug"}
      </button>
    ) : exitHref ? (
      <V2ExitLink href={exitHref} className="v2-flow-header__side">
        {exitLabel}
      </V2ExitLink>
    ) : (
      <span className="v2-flow-header__side" aria-hidden="true" />
    );

    const right = trailing ? (
      <div className="v2-flow-header__side v2-flow-header__trailing">{trailing}</div>
    ) : onBack && exitHref ? (
      <V2ExitLink
        href={exitHref}
        className="v2-flow-header__side v2-flow-header__exit"
      >
        {exitLabel}
      </V2ExitLink>
    ) : (
      <span className="v2-flow-header__side" aria-hidden="true" />
    );

    return (
      <header className="v2-flow-header">
        {left}
        <p className="v2-flow-header__brand">Structuro</p>
        {right}
      </header>
    );
  }

  return (
    <header style={v2Styles.header}>
      <V2Brand />
      {exitHref ? (
        <V2ExitLink
          href={exitHref}
          className="v2-textlink"
          style={{ ...v2Styles.textlink, opacity: 0.42 }}
        >
          {exitLabel}
        </V2ExitLink>
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

function pulseNavHaptic() {
  triggerHaptic(HAPTIC_PATTERNS.NAV_TAP, { respectReducedMotion: true });
}

/**
 * v2 bottom-nav als compacte frosted island: semi-transparant cream + blur,
 * strakke icon-spacing, sage soft-pill op actief.
 * "Afsluiten" opent het shutdown-ritueel op /v2/shutdown.
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
    <nav className="v2-app-nav" style={v2Styles.appNav} aria-label="v2 navigatie">
      <div className="v2-app-nav__island" style={v2Styles.appNavIsland}>
        {tabs.map((tab) => {
          const active = tab.href ? isActiveTab(pathname, tab.href) : false;
          const itemStyle: CSSProperties = {
            ...v2Styles.appNavItem,
            ...(active ? v2Styles.appNavItemActive : {}),
            color: active ? "var(--accent)" : "var(--text-muted)",
            opacity: active ? 1 : 0.42,
          };
          const itemClass = `v2-app-nav__item${active ? " is-active" : ""}`;
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
                className={itemClass}
                style={itemStyle}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                title={tab.label}
                onClick={pulseNavHaptic}
              >
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              className={itemClass}
              onClick={() => {
                pulseNavHaptic();
                tab.onClick?.();
              }}
              style={itemStyle}
              aria-label={tab.label}
              title={tab.label}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * v2 app-shell in Variant F: warm papier (--surface), serif wordmark, één
 * rustige tekst-uitgang (geen gevulde knop in de chrome), en de frosted island-nav.
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
  const router = useRouter();
  const { t } = useI18n();
  const onSettings = isActiveTab(pathname, "/v2/settings");
  // Guest: geen Uitloggen (RSD/verwarring). Pas na mount; SSR = geen hint.
  const [showLogout, setShowLogout] = useState(false);
  const headerPad = {
    paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
    paddingLeft: 24,
    paddingRight: 24,
  } as const;

  useEffect(() => {
    setShowLogout(hasSupabaseAuthHintOnClient());
  }, []);

  const handleLogout = () => {
    void performClientLogout(router, { loginPath: "/v2/login" });
  };

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
                height={28}
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
                  aria-label={t("layout.settings")}
                  title={t("layout.settings")}
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
              {showLogout ? (
                <button
                  type="button"
                  className="v2-headerlink v2-headerlink--icon"
                  style={v2Styles.appHeaderLink}
                  onClick={handleLogout}
                  aria-label={t("layout.logout")}
                  title={t("layout.logout")}
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
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              ) : null}
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
