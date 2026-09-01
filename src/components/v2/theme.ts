import type { CSSProperties } from "react";

/**
 * welcome: energy/afronding, verticaal gecentreerd in flowShell.
 * choices: langere keuzestappen hoger uitgelijnd (opties boven de vouw).
 */
export type V2FlowLayout = "welcome" | "choices";

export function v2FlowLayoutForOnboardingPhase(phase: string): V2FlowLayout {
  switch (phase) {
    case "done":
    case "account":
    case "name":
    case "energy":
      return "welcome";
    case "ownTask":
    case "adjust":
    default:
      return "choices";
  }
}

export function v2FlowLayoutForDagstartPhase(phase: string): V2FlowLayout {
  return phase === "done" || phase === "energy" ? "welcome" : "choices";
}

export function v2FlowWrapStyle(layout: V2FlowLayout): CSSProperties {
  return layout === "welcome"
    ? v2Styles.flowCardWrapWelcome
    : v2Styles.flowCardWrapChoices;
}

/**
 * Gedeeld, prikkelarm designsysteem voor de /v2-testomgeving.
 * Story-layer variabelen uit globals.css: light-first, witte kaarten,
 * ruime radius, geen gradients/zware shadows, een kolom, max ~480px,
 * grote tap-targets (>=56px). Respecteert prefers-reduced-motion.
 */

export const v2Styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    display: "flex",
    justifyContent: "center",
    padding: "24px 20px 48px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  /** V2Page scrollt binnen v2-root (geen dubbele scroll met V2AppShell). */
  pageScroll: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    display: "block",
    minHeight: "100%",
    boxSizing: "border-box",
    paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
    paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))",
    paddingLeft: "max(20px, env(safe-area-inset-left, 0px))",
    paddingRight: "max(20px, env(safe-area-inset-right, 0px))",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 560,
    marginLeft: "auto",
    marginRight: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: "100%",
    boxSizing: "border-box",
  },
  /** Vult resterende hoogte na header + voortgang; card-positionering binnenin. */
  flowShell: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  /** Energy/afronding: verticaal gecentreerd in beschikbare hoogte (onder header/progress). */
  flowCardWrapWelcome: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "center",
    width: "100%",
    /* Ruimte onder header/progress zodat de energy-orb niet tegen de top zit. */
    paddingTop: "clamp(1.25rem, 4vh, 2.25rem)",
    paddingBottom: "max(clamp(1.25rem, 6vh, 3rem), env(safe-area-inset-bottom, 0px))",
    gap: 12,
  },
  /** Langere keuzestappen: opties bovenaan houden. */
  flowCardWrapChoices: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    width: "100%",
    paddingTop: "clamp(0.5rem, 2.5vh, 1.5rem)",
    gap: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "var(--text)",
    textDecoration: "none",
  },
  brandRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: {
    height: 16,
    width: 22,
    objectFit: "contain",
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--accent)",
    backgroundColor: "rgba(45, 90, 86, 0.08)",
    border: "1px solid var(--border)",
    borderRadius: 999,
    padding: "4px 10px",
  },
  textlink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--text-muted)",
    padding: "8px 4px",
    textDecoration: "none",
  },
  progressWrap: {
    marginTop: 4,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "var(--border)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "var(--accent)",
    transition: "width 200ms ease",
  },
  progressLabel: {
    fontSize: 13,
    color: "var(--text-muted)",
    margin: 0,
    marginTop: 10,
    textAlign: "left",
  },
  progressHint: {
    color: "var(--text-muted)",
    opacity: 0.85,
  },
  reassuranceBelow: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-muted)",
    opacity: 0.85,
    textAlign: "center",
    margin: 0,
  },
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "26px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  /** Energiestap: geen witte kaart; vult flowShell zodat body/footer kunnen centreren/pinnen. */
  cardEnergy: {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: 0,
    padding: "16px 8px 12px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    gap: 16,
    boxShadow: "none",
  },
  kicker: {
    fontSize: 14,
    color: "var(--accent)",
    margin: 0,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--accent)",
    margin: 0,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "var(--accent)",
    flexShrink: 0,
  },
  title: {
    fontFamily: "var(--font-serif)",
    fontSize: 26,
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    margin: 0,
    color: "var(--text)",
  },
  body: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--text-muted)",
    margin: 0,
  },
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  /**
   * Eén canonieke keuze/secundaire-knopstijl: gebruikt door alle plekken waar de
   * gebruiker uit opties kiest (energie, taak-keuze, focus kort/middel/lang).
   * Iets steviger rand + lichte lift, zodat keuzeknoppen niet vlak/licht ogen.
   */
  option: {
    width: "100%",
    minHeight: 56,
    padding: "16px 18px",
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    fontSize: 16,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(26, 26, 27, 0.05)",
  },
  optionActive: {
    border: "1.5px solid var(--accent)",
    backgroundColor: "rgba(45, 90, 86, 0.06)",
  },
  input: {
    width: "100%",
    minHeight: 56,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    fontSize: 16,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
    marginTop: 8,
  },
  softActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  cta: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    border: "none",
    backgroundColor: "var(--cta)",
    color: "var(--text-on-ink)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(42, 107, 100, 0.28)",
  },
  ctaSecondary: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(26, 26, 27, 0.05)",
  },
  skipLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--text-muted)",
    padding: "10px 8px",
  },
  anchorCard: {
    backgroundColor: "rgba(45, 90, 86, 0.06)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  anchorQuote: {
    fontSize: 18,
    lineHeight: 1.5,
    color: "var(--text)",
    margin: 0,
  },
  anchorOutcome: {
    fontSize: 14,
    color: "var(--text-muted)",
    margin: 0,
  },
  resultCard: {
    backgroundColor: "rgba(45, 90, 86, 0.06)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resultThing: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text)",
    margin: 0,
  },
  resultAnchor: {
    fontSize: 14,
    color: "var(--accent)",
    margin: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-start",
    width: "100%",
  },
  backLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--text-muted)",
    padding: "8px 4px",
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  navItem: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    textDecoration: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  navItemTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
  },
  navItemDesc: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  },

  /* v2 app-shell (story-huisstijl, geen work-layer app-look) */
  appPage: {
    flex: 1,
    minHeight: 0,
    height: "100%",
    width: "100%",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    overflow: "hidden",
  },
  appHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 56,
    padding: "12px 20px",
    borderBottom: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
  },
  appMain: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "24px 20px 32px",
  },
  /** Scrollbare main in V2AppShell (geen Tailwind nodig). */
  appMainScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    position: "relative",
    zIndex: 1,
  },
  /** Vaste main in V2AppShell (focus/timer). */
  appMainFixed: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  /** Soft-prompt tussen scroll-main en bottom-nav. */
  appBottomSlot: {
    flexShrink: 0,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "0 16px 8px",
    backgroundColor: "var(--surface)",
  },
  appShellBrand: {
    display: "inline-flex",
    minWidth: 0,
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    lineHeight: 1,
  },
  appShellLogo: {
    height: 28,
    width: 28,
    flexShrink: 0,
    display: "block",
    objectFit: "contain" as const,
  },
  appShellWordmark: {
    fontFamily: "var(--font-serif)",
    fontSize: "1.25rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  appShellBadge: {
    marginLeft: 4,
    flexShrink: 0,
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--accent)",
    background: "var(--accent-soft)",
  },
  appHeaderActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  appHeaderLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    padding: "8px 10px",
    borderRadius: 12,
    border: "none",
    background: "none",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
    color: "var(--text-muted)",
    textDecoration: "none",
    cursor: "pointer",
  },
  appHeaderLinkActive: {
    color: "var(--accent)",
  },
  settingsPage: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: "24px 20px 32px",
  },
  settingsSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  settingsSectionTitle: {
    margin: 0,
    padding: "0 4px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 16,
    overflow: "hidden",
  },
  settingsRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 18px",
    borderBottom: "1px solid var(--border)",
  },
  settingsRowLast: {
    borderBottom: "none",
  },
  settingsLabel: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
  },
  settingsHint: {
    margin: "4px 0 0",
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-muted)",
  },
  settingsToggle: {
    position: "relative",
    width: 48,
    height: 28,
    flexShrink: 0,
    borderRadius: 999,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    backgroundColor: "var(--surface)",
    cursor: "pointer",
    padding: 0,
  },
  settingsToggleOn: {
    backgroundColor: "var(--accent)",
    borderColor: "var(--accent)",
  },
  settingsToggleKnob: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(26, 26, 27, 0.12)",
    transition: "transform 160ms ease",
  },
  settingsToggleKnobOn: {
    transform: "translateX(20px)",
  },
  settingsDangerBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    padding: "12px 16px",
    textAlign: "left" as const,
  },
  settingsInnerCard: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    backgroundColor: "#FFFFFF",
  },
  settingsPeriodDate: {
    margin: "6px 0 0",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
  },
  settingsPeriodEmpty: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "var(--text-muted)",
  },
  settingsStepperRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    padding: "4px 0",
  },
  settingsStepperBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    flexShrink: 0,
    borderRadius: "50%",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    backgroundColor: "#FFFFFF",
    color: "var(--text)",
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
    touchAction: "manipulation",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsStepperValue: {
    textAlign: "center" as const,
    flex: 1,
    minWidth: 0,
  },
  settingsStepperNumber: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    fontVariantNumeric: "tabular-nums",
    color: "var(--text)",
  },
  settingsExpanded: {
    padding: "0 18px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    borderTop: "1px solid var(--border)",
  },
  /**
   * Wrapper rond de floating island: transparant zodat frosted glass zichtbaar
   * is, safe-area onder, eiland gecentreerd. Horizontale padding = home px-5
   * zodat max-width 480px gelijk loopt met de content/card-kolom.
   */
  appNav: {
    flexShrink: 0,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding:
      "8px max(20px, env(safe-area-inset-left, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-right, 0px))",
    backgroundColor: "transparent",
  },
  /**
   * Structuro-island: frosted dock, breedte = contentkolom (max 480px),
   * zelfde als home card / evening-cloud-slot. Tabs spreiden over de breedte.
   * Maten: ~44px targets / 22px iconen / 11px labels.
   * Glass-styling in structuro-tokens.css (blur + semi-transparant).
   */
  appNavIsland: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    padding: "6px 8px",
    borderRadius: 999,
    border: "1px solid rgba(26, 35, 64, 0.08)",
    /* Achtergrond + blur in structuro-tokens.css (focus-mode override). */
  },
  appNavInner: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    justifyContent: "space-around",
    gap: 4,
  },
  appNavItem: {
    flex: "1 1 0",
    minHeight: 44,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: "6px 8px",
    borderRadius: 999,
    border: "none",
    backgroundColor: "transparent",
    color: "var(--text-muted)",
    textDecoration: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    transition:
      "opacity 140ms ease, color 140ms ease, background-color 140ms ease, transform 100ms ease",
  },
  /** Soft sage-pill + accent; geen gevulde knop. */
  appNavItemActive: {
    color: "var(--accent)",
    backgroundColor: "var(--accent-soft)",
  },
  appNavLabel: {
    width: "100%",
    textAlign: "center" as const,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: "0.01em",
    color: "var(--accent)",
  },
  appNavIcon: {
    flexShrink: 0,
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

/** Scoped CSS: zachte fade, hovers, focus-visible. Geen confetti/typewriter. */
export const v2ScopedCss = `
.v2-root,
.v2-root *,
.v2-root *::before,
.v2-root *::after {
  box-sizing: border-box;
}
.v2-page {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}
.v2-shell {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  max-width: 560px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box !important;
}
.v2-fade { animation: v2FadeIn 180ms ease-out; }
@keyframes v2FadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.v2-cta { transition: background-color 160ms ease; }
.v2-cta:hover { background-color: var(--cta-hover) !important; }
.v2-secondary { transition: border-color 160ms ease, background-color 160ms ease; }
.v2-secondary:hover { border-color: var(--accent) !important; }
.v2-stepper-btn { transition: border-color 160ms ease, background-color 160ms ease; }
.v2-stepper-btn:hover:not(:disabled) {
  border-color: var(--accent) !important;
  background-color: rgba(45, 90, 86, 0.04) !important;
}
.v2-stepper-btn:disabled { cursor: not-allowed; }
.v2-stepper-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-option { transition: border-color 160ms ease, background-color 160ms ease; }
.v2-option:hover { border-color: var(--accent) !important; }
.v2-nav { transition: border-color 160ms ease, background-color 160ms ease; }
.v2-nav:hover { border-color: var(--accent) !important; }
.v2-textlink { transition: color 160ms ease; }
.v2-textlink:hover { color: var(--text) !important; }
.v2-cta:focus-visible,
.v2-secondary:focus-visible,
.v2-option:focus-visible,
.v2-nav:focus-visible,
.v2-textlink:focus-visible,
.v2-input:focus-visible,
.v2-headerlink:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-input:focus { border-color: var(--accent) !important; }
.v2-navitem { transition: color 160ms ease; }
.v2-navitem:hover { color: var(--text) !important; }
.v2-app-nav__item:active {
  opacity: 0.72;
  transform: scale(0.96);
}
.v2-app-nav__item svg {
  width: 22px;
  height: 22px;
}
.v2-app-nav__item.is-active svg {
  stroke-width: 2.15;
}
.v2-app-nav__item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-headerlink { transition: color 160ms ease, background-color 160ms ease; }
.v2-headerlink:hover { color: var(--text) !important; background-color: rgba(45, 90, 86, 0.06); }
.v2-eyebrow-dot { animation: v2EyebrowPulse 2.4s ease-in-out infinite; }
@keyframes v2EyebrowPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.82); }
}
.v2-fade-out {
  animation: v2FadeOut 400ms ease-out forwards;
}
.v2-done-ack {
  margin: 2px 0 0 36px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--accent);
}
.v2-done-ack--block {
  margin-left: 0;
  margin-top: 10px;
  text-align: center;
}
.v2-focus-done-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.v2-done-ack-check {
  animation: v2DonePop 280ms ease-out;
}
.v2-done-overlay {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  box-sizing: border-box;
  background: var(--surface);
  color: var(--text);
}
.v2-done-overlay__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 34px;
}
.v2-done-overlay__check {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 30px -18px color-mix(in srgb, var(--accent) 85%, transparent);
}
.v2-done-overlay__check::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  opacity: 0;
}
.v2-done-overlay.is-anim .v2-done-overlay__check {
  animation: v2DoneRingIn 520ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
}
.v2-done-overlay.is-anim .v2-done-overlay__check::after {
  animation: v2DoneHalo 760ms cubic-bezier(0.25, 0.6, 0.2, 1) 180ms both;
}
.v2-done-overlay__tick {
  stroke-dasharray: 26;
  stroke-dashoffset: 0;
}
.v2-done-overlay.is-anim .v2-done-overlay__tick {
  stroke-dashoffset: 26;
  animation: v2DoneTick 420ms cubic-bezier(0.4, 0, 0.2, 1) 200ms both;
}
.v2-done-overlay__title {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 38px;
  line-height: 1.02;
  letter-spacing: -0.026em;
  margin: 28px 0 10px;
  text-wrap: pretty;
  text-align: center;
  color: var(--text);
  overflow-wrap: anywhere;
  max-width: 16ch;
}
.v2-done-overlay__klaar {
  margin: 0;
  font-family: var(--font-ui, var(--font-inter), system-ui, sans-serif);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.01em;
  color: var(--accent);
}
.v2-done-overlay__rule {
  width: 100%;
  max-width: 322px;
  height: 1px;
  background: var(--border);
  margin: 34px 0 0;
}
.v2-done-overlay .v2-done-tally {
  gap: 56px;
  padding: 26px 0 24px;
  margin: 0;
}
.v2-done-overlay .v2-done-tally__n {
  font-weight: 400;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: var(--text);
}
.v2-done-overlay .v2-done-tally__label {
  font-weight: 500;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: var(--text-muted);
}
.v2-done-overlay__ack {
  margin: 0;
  max-width: 26ch;
  font-family: var(--font-ui, var(--font-inter), system-ui, sans-serif);
  font-weight: 500;
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
  color: var(--text-muted);
}
.v2-done-overlay__foot {
  flex: none;
  padding: 0 30px max(34px, env(safe-area-inset-bottom, 0px));
}
.v2-done-overlay__action {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  cursor: pointer;
  margin: 0;
  background: var(--cta);
  color: var(--text-on-ink);
  font-family: var(--font-ui, var(--font-inter), system-ui, sans-serif);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.005em;
  transition: background 160ms;
}
.v2-done-overlay__action:hover {
  background: var(--cta-hover);
}
.v2-done-overlay__action:active {
  transform: translateY(1px);
}
.v2-done-overlay__action:focus-visible {
  outline: 3px solid var(--accent-ring);
  outline-offset: 2px;
}
.v2-done-tally-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}
.v2-done-tally-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.v2-done-tally-group__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.v2-done-tally {
  display: flex;
  gap: 28px;
  justify-content: center;
  margin-top: 0;
}
.v2-done-tally__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.v2-done-tally__n {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.v2-done-tally__label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}
@keyframes v2DonePop {
  from { transform: scale(0.86); opacity: 0.55; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes v2DoneRingIn {
  0% { transform: scale(0.74); opacity: 0; }
  62% { transform: scale(1.035); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes v2DoneHalo {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.85); opacity: 0; }
}
@keyframes v2DoneTick {
  to { stroke-dashoffset: 0; }
}
@keyframes v2FadeOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.98); }
}
.v2-focus-bubble-extended {
  animation: v2FocusGlow 2.4s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(45, 90, 86, 0.25), 0 0 48px rgba(45, 90, 86, 0.18);
  transform: scale(1.06);
}
@keyframes v2FocusGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(45, 90, 86, 0.2), 0 0 40px rgba(45, 90, 86, 0.12); transform: scale(1.04); }
  50% { box-shadow: 0 0 0 8px rgba(45, 90, 86, 0.08), 0 0 56px rgba(45, 90, 86, 0.22); transform: scale(1.08); }
}
.v2-voice-blob {
  animation: v2VoicePulse 2s ease-in-out infinite;
}
@keyframes v2VoicePulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.12); opacity: 1; }
}
.v2-shutdown {
  position: relative;
  box-sizing: border-box;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.v2-shutdown__page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 20px 16px;
}
.v2-shutdown__title {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: clamp(1.85rem, 6vw, 2.3rem);
  line-height: 1.01;
  letter-spacing: -0.028em;
  margin: 16px 0 14px;
  max-width: 15ch;
  color: var(--text);
}
.v2-shutdown__lede {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 29ch;
}
.v2-shutdown__empty {
  margin: 26px 0 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-muted);
}
.v2-shutdown-dones {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 30px 0 0;
}
.v2-shutdown-dones__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.v2-shutdown.is-play .v2-shutdown-dones__row {
  opacity: 0;
  transform: translateY(8px);
  animation: v2ShutdownRise 420ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
}
.v2-shutdown-dones__tick {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 26px;
}
.v2-shutdown-dones__name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.012em;
  flex: 1;
  min-width: 0;
  color: var(--text);
}
.v2-shutdown-dones__time {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted);
  flex: none;
}
.v2-shutdown-totals {
  display: flex;
  gap: 26px;
  margin: 26px 0 0;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}
.v2-shutdown.is-play .v2-shutdown-totals {
  opacity: 0;
  transform: translateY(8px);
  animation: v2ShutdownRise 500ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
}
.v2-shutdown-totals__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.v2-shutdown-totals__item b {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 19px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text-muted);
}
.v2-shutdown-totals__item span {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}
.v2-shutdown__slab {
  margin: 16px 0 12px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.v2-shutdown-keep {
  display: flex;
  flex-direction: column;
}
.v2-shutdown-keep__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
}
.v2-shutdown-keep__row:last-of-type {
  border-bottom: 1px solid var(--border);
}
.v2-shutdown-keep__name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
  color: var(--text);
}
.v2-shutdown-keep__row.is-off .v2-shutdown-keep__name {
  color: var(--text-muted);
}
.v2-shutdown-pill {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  flex: none;
  height: 32px;
  padding: 0 13px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  border: 1px solid transparent;
}
.v2-shutdown-pill.is-off {
  background: transparent;
  color: var(--text-muted);
  border-color: color-mix(in srgb, var(--text) 14%, transparent);
}
.v2-shutdown-pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: block;
}
.v2-shutdown-pill svg {
  margin-left: 1px;
  opacity: 0.55;
}
.v2-shutdown-pill:focus-visible,
.v2-shutdown-addlink:focus-visible,
.v2-shutdown__quiet:focus-visible,
.v2-shutdown__outline:focus-visible,
.v2-shutdown-opts button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-shutdown__note {
  margin: 16px 0 0;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 32ch;
}
.v2-shutdown-addlink {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.v2-shutdown-dump {
  margin-top: 20px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 280ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 200ms;
}
.v2-shutdown-dump.is-open {
  max-height: 220px;
  opacity: 1;
}
.v2-shutdown-dump h2 {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 23px;
  line-height: 1.1;
  letter-spacing: -0.024em;
  margin: 0 0 12px;
  color: var(--text);
}
.v2-shutdown-dump textarea {
  width: 100%;
  min-height: 62px;
  resize: none;
  background: transparent;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text) 14%, transparent);
  padding: 0 0 12px;
  font: 500 16px / 1.5 var(--font-ui);
  color: var(--text);
  outline: none;
}
.v2-shutdown-dump textarea::placeholder {
  color: color-mix(in srgb, var(--text) 32%, transparent);
}
.v2-shutdown-dump textarea:focus {
  border-color: var(--accent);
}
.v2-shutdown-dump__hint {
  margin: 10px 0 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted);
}
.v2-shutdown-saved {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-muted);
}
.v2-shutdown-saved i {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.v2-shutdown__foot {
  flex: none;
  padding: 8px 20px max(16px, env(safe-area-inset-bottom, 0px));
}
.v2-shutdown__primary {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-cta);
  cursor: pointer;
  background: var(--cta);
  color: var(--text-on-ink);
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  transition: background 160ms;
}
.v2-shutdown__primary:hover { background: var(--cta-hover); }
.v2-shutdown__primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-shutdown__quiet {
  all: unset;
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: center;
  margin-top: 12px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-muted);
}
.v2-shutdown__quiet:hover { color: var(--text); }
.v2-shutdown__outline {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-cta);
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--text) 14%, transparent);
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}
.v2-shutdown__outline:hover { border-color: var(--text); }
.v2-shutdown-dim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--text) 34%, transparent);
  display: none;
  z-index: 8;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.v2-shutdown-dim.is-on { display: block; }
.v2-shutdown-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--surface);
  border-radius: 28px 28px 0 0;
  padding: 26px 26px 30px;
  box-shadow: 0 -24px 60px -30px color-mix(in srgb, var(--text) 60%, transparent);
  display: none;
}
.v2-shutdown-sheet.is-on { display: block; }
.v2-shutdown-sheet h2 {
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 25px;
  line-height: 1.12;
  letter-spacing: -0.024em;
  margin: 0 0 8px;
  max-width: 20ch;
  color: var(--text);
}
.v2-shutdown-sheet p {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.55;
  color: var(--text-muted);
  margin: 0 0 22px;
}
.v2-shutdown-sheet__grip {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text) 16%, transparent);
  margin: 0 auto 18px;
}
.v2-shutdown-opts { display: flex; flex-direction: column; }
.v2-shutdown-opts button {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 15px 2px;
  border-top: 1px solid var(--border);
}
.v2-shutdown-opts button:last-child { border-bottom: 1px solid var(--border); }
.v2-shutdown-opts button:hover b { color: var(--accent); }
.v2-shutdown-opts b {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.012em;
  color: var(--text);
}
.v2-shutdown-opts span {
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--text-muted);
}
@keyframes v2ShutdownRise {
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .v2-fade { animation: none !important; }
  .v2-cta, .v2-secondary, .v2-option, .v2-nav, .v2-textlink, .v2-navitem, .v2-headerlink, .v2-stepper-btn, .v2-app-nav__item { transition: none !important; }
  .v2-app-nav__item:active { transform: none !important; }
  .v2-progress-fill { transition: none !important; }
  .v2-eyebrow-dot { animation: none !important; }
  .v2-fade-out { animation: none !important; }
  .v2-done-ack-check { animation: none !important; }
  .v2-done-overlay.is-anim .v2-done-overlay__check,
  .v2-done-overlay.is-anim .v2-done-overlay__check::after,
  .v2-done-overlay.is-anim .v2-done-overlay__tick { animation: none !important; }
  .v2-done-overlay.is-anim .v2-done-overlay__tick { stroke-dashoffset: 0 !important; }
  .v2-done-overlay__action:active { transform: none; }
  .v2-focus-bubble-extended { animation: none !important; transform: scale(1.04) !important; }
  .v2-voice-blob { animation: none !important; }
  .v2-shutdown.is-play .v2-shutdown-dones__row,
  .v2-shutdown.is-play .v2-shutdown-totals {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .v2-shutdown-dump { transition: none; }
}
`;
