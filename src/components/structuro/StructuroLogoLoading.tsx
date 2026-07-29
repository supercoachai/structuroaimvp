"use client";

type StructuroLogoLoadingProps = {
  className?: string;
  /** Volledig viewport-splash (bridge, auth, redirects). */
  fullScreen?: boolean;
  /** Breedte in px; hoogte volgt de mark-aspectratio 112×81. */
  size?: number;
};

/** Lichte merkmart (~9KB), geen wordmark-tekst. */
const LOGO_SRC = "/v2/logo-mark.png";
const LOGO_ASPECT = 81 / 112;

/** Canonieke cream (v2 --surface / story-bg). Hard fallback vóór CSS-tokens. */
export const STRUCTURO_CREAM = "#FDFBF4";

/**
 * Tussenscherm tijdens laden/soft-advance: alleen het Structuro-logo op cream.
 * Geen wordmark, geen "even geduld", nooit v1-grijs (#F0F2F8).
 * Gebruik `bg-transparent` in className als de parent al cream is.
 */
export default function StructuroLogoLoading({
  className = "",
  fullScreen = true,
  size = 88,
}: StructuroLogoLoadingProps) {
  const height = Math.round(size * LOGO_ASPECT);
  const transparent = /\bbg-transparent\b/.test(className);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Structuro"
      className={
        fullScreen
          ? `flex min-h-[100dvh] w-full flex-col items-center justify-center ${className}`.trim()
          : `flex flex-col items-center justify-center ${className}`.trim()
      }
      style={
        transparent
          ? undefined
          : { backgroundColor: `var(--surface, ${STRUCTURO_CREAM})` }
      }
    >
      <img
        src={LOGO_SRC}
        alt=""
        width={size}
        height={height}
        className="object-contain"
        decoding="async"
      />
    </div>
  );
}
