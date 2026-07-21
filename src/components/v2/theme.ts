import type { CSSProperties } from "react";

/** Welkom/reflectie: verticaal gecentreerd in flowShell. Keuzestappen: hoger uitgelijnd voor opties boven de vouw. */
export type V2FlowLayout = "welcome" | "choices";

export function v2FlowLayoutForOnboardingPhase(phase: string): V2FlowLayout {
  switch (phase) {
    case "welcome":
    case "energy":
    case "cycle":
    case "done":
      return "welcome";
    case "adjust":
    default:
      return "choices";
  }
}

export function v2FlowLayoutForDagstartPhase(phase: string): V2FlowLayout {
  return phase === "welcome" || phase === "done" || phase === "energy"
    ? "welcome"
    : "choices";
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
    maxWidth: 480,
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
  /** Welkom, energie en afronding: verticaal gecentreerd in de beschikbare hoogte. */
  flowCardWrapWelcome: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "center",
    width: "100%",
    paddingTop: "clamp(1rem, 4vh, 2.5rem)",
    paddingBottom: "max(clamp(2rem, 10vh, 4.5rem), env(safe-area-inset-bottom, 0px))",
    gap: 12,
  },
  /** Langere keuzestappen: opties bovenaan houden, shell blijft horizontaal gecentreerd. */
  flowCardWrapChoices: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    width: "100%",
    paddingTop: "clamp(0.75rem, 5vh, 2.5rem)",
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
  /** Energiestap: geen witte kaart, content zweeft op cream. */
  cardEnergy: {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: 0,
    padding: "12px 4px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
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
    backgroundColor: "var(--ink)",
    color: "var(--text-on-ink)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(26, 26, 27, 0.22)",
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
    padding: "16px 20px",
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
    padding: "0 16px 8px",
    backgroundColor: "var(--surface)",
  },
  appShellBrand: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
  },
  appShellLogo: {
    height: 28,
    width: 28,
    flexShrink: 0,
    objectFit: "contain" as const,
  },
  appShellWordmark: {
    fontFamily: "var(--font-serif)",
    fontSize: "1.25rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
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
    gap: 4,
    flexShrink: 0,
  },
  appHeaderLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    padding: "8px 10px",
    borderRadius: 12,
    border: "none",
    background: "none",
    fontSize: 14,
    fontWeight: 500,
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
    fontStyle: "italic" as const,
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
  appNav: {
    flexShrink: 0,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 0,
    padding: "6px 4px max(0.75rem, env(safe-area-inset-bottom, 0px))",
    borderTop: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
  },
  appNavInner: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    justifyContent: "space-around",
    gap: 4,
  },
  appNavItem: {
    minHeight: 40,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    padding: "4px 2px",
    borderRadius: 12,
    border: "none",
    background: "none",
    color: "var(--text-muted)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 140ms ease, color 140ms ease",
  },
  appNavItemActive: {
    color: "var(--accent)",
  },
  appNavLabel: {
    width: "100%",
    textAlign: "center" as const,
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: "0.03em",
  },
  appNavIcon: {
    flexShrink: 0,
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
  max-width: 480px !important;
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
.v2-cta:hover { background-color: var(--ink-hover) !important; }
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
.v2-headerlink { transition: color 160ms ease, background-color 160ms ease; }
.v2-headerlink:hover { color: var(--text) !important; background-color: rgba(45, 90, 86, 0.06); }
.v2-eyebrow-dot { animation: v2EyebrowPulse 2.4s ease-in-out infinite; }
@keyframes v2EyebrowPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.82); }
}
.v2-fade-out {
  animation: v2FadeOut 300ms ease-out forwards;
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
@media (prefers-reduced-motion: reduce) {
  .v2-fade { animation: none !important; }
  .v2-cta, .v2-secondary, .v2-option, .v2-nav, .v2-textlink, .v2-navitem, .v2-headerlink, .v2-stepper-btn { transition: none !important; }
  .v2-progress-fill { transition: none !important; }
  .v2-eyebrow-dot { animation: none !important; }
  .v2-fade-out { animation: none !important; opacity: 0 !important; }
  .v2-focus-bubble-extended { animation: none !important; transform: scale(1.04) !important; }
  .v2-voice-blob { animation: none !important; }
}
`;
