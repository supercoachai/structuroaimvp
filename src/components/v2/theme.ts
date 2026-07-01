import type { CSSProperties } from "react";

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
  shell: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    gap: 20,
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
    height: 22,
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
  },
  progressHint: {
    color: "var(--text-muted)",
    opacity: 0.85,
  },
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
    lineHeight: 1.12,
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
    borderColor: "var(--accent)",
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
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  softActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
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
    minHeight: "100dvh",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
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
  appNav: {
    position: "sticky",
    bottom: 0,
    width: "100%",
    display: "flex",
    justifyContent: "center",
    gap: 4,
    padding: "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))",
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
    flex: 1,
    minHeight: 56,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "8px 4px",
    borderRadius: 14,
    border: "none",
    background: "none",
    color: "var(--text-muted)",
    textDecoration: "none",
    cursor: "pointer",
  },
  appNavItemActive: {
    color: "var(--accent)",
  },
  appNavLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
};

/** Scoped CSS: zachte fade, hovers, focus-visible. Geen confetti/typewriter. */
export const v2ScopedCss = `
.v2-fade { animation: v2FadeIn 180ms ease-out; }
@keyframes v2FadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.v2-cta { transition: background-color 160ms ease; }
.v2-cta:hover { background-color: var(--ink-hover) !important; }
.v2-secondary { transition: border-color 160ms ease, background-color 160ms ease; }
.v2-secondary:hover { border-color: var(--accent) !important; }
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
.v2-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.v2-input:focus { border-color: var(--accent) !important; }
.v2-navitem { transition: color 160ms ease; }
.v2-navitem:hover { color: var(--text) !important; }
.v2-eyebrow-dot { animation: v2EyebrowPulse 2.4s ease-in-out infinite; }
@keyframes v2EyebrowPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.82); }
}
@media (prefers-reduced-motion: reduce) {
  .v2-fade { animation: none !important; }
  .v2-cta, .v2-secondary, .v2-option, .v2-nav, .v2-textlink, .v2-navitem { transition: none !important; }
  .v2-progress-fill { transition: none !important; }
  .v2-eyebrow-dot { animation: none !important; }
}
`;
