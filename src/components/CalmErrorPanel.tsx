"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Gedeeld foutscherm in Variant F-taal (cream, Newsreader, navy CTA).
 * Inline styles + harde token-fallbacks zodat het ook werkt buiten .v2-root
 * (route error.tsx, ErrorBoundary, global-error zonder CSS-bundle).
 */

const SURFACE = "#fdfbf4";
const INK = "#1a2340";
const TEXT = "#1a1a1b";
const TEXT_MUTED = "#5c6478";
const TEXT_ON_INK = "#f5f2ea";
const BORDER = "rgba(26, 26, 27, 0.1)";

const FONT_UI =
  'var(--font-inter), system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_SERIF =
  'var(--font-newsreader), Georgia, "Times New Roman", serif';

export type CalmErrorPanelProps = {
  title: string;
  body: string;
  retryLabel?: string;
  refreshLabel: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  note?: string;
  detailsLabel?: string;
  detailText?: string;
  /** Volledig viewport (ErrorBoundary / global-error) vs compact (route segment). */
  fullScreen?: boolean;
  children?: ReactNode;
};

const shellStyle = (fullScreen: boolean): CSSProperties => ({
  minHeight: fullScreen ? "100dvh" : "50dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: SURFACE,
  color: TEXT,
  padding: "24px 20px",
  fontFamily: FONT_UI,
  boxSizing: "border-box",
});

const panelStyle: CSSProperties = {
  maxWidth: 400,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const titleStyle: CSSProperties = {
  fontFamily: FONT_SERIF,
  fontSize: 28,
  lineHeight: 1.2,
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: TEXT,
  margin: 0,
};

const bodyStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.55,
  color: TEXT_MUTED,
  margin: 0,
};

const noteStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  color: TEXT_MUTED,
  margin: 0,
};

const primaryBtnStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "12px 20px",
  backgroundColor: INK,
  color: TEXT_ON_INK,
  border: "none",
  borderRadius: 16,
  fontFamily: FONT_UI,
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: "-0.006em",
  cursor: "pointer",
  boxShadow:
    "0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 10px 24px -10px rgba(26, 35, 64, 0.5)",
};

const linkBtnStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  background: "transparent",
  color: INK,
  border: "none",
  borderRadius: 12,
  fontFamily: FONT_UI,
  fontWeight: 500,
  fontSize: 15,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  textDecorationColor: BORDER,
};

const detailsStyle: CSSProperties = {
  fontSize: 13,
  color: TEXT_MUTED,
};

const preStyle: CSSProperties = {
  marginTop: 8,
  padding: 12,
  backgroundColor: "rgba(26, 35, 64, 0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  overflow: "auto",
  fontSize: 11,
  color: TEXT,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily:
    'var(--font-jetbrains-mono), ui-monospace, Menlo, Monaco, monospace',
};

export function CalmErrorPanel({
  title,
  body,
  retryLabel,
  refreshLabel,
  onRetry,
  onRefresh,
  note,
  detailsLabel,
  detailText,
  fullScreen = false,
  children,
}: CalmErrorPanelProps) {
  const handleRefresh = onRefresh ?? (() => window.location.reload());
  const showRetry = Boolean(onRetry && retryLabel);

  return (
    <div style={shellStyle(fullScreen)} role="alert">
      <div style={panelStyle}>
        <h1 style={titleStyle}>{title}</h1>
        <p style={bodyStyle}>{body}</p>
        {note ? <p style={noteStyle}>{note}</p> : null}
        {detailsLabel && detailText ? (
          <details style={detailsStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 500 }}>
              {detailsLabel}
            </summary>
            <pre style={preStyle}>{detailText}</pre>
          </details>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 8,
          }}
        >
          {showRetry ? (
            <>
              <button type="button" onClick={onRetry} style={primaryBtnStyle}>
                {retryLabel}
              </button>
              <button type="button" onClick={handleRefresh} style={linkBtnStyle}>
                {refreshLabel}
              </button>
            </>
          ) : (
            <button type="button" onClick={handleRefresh} style={primaryBtnStyle}>
              {refreshLabel}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
