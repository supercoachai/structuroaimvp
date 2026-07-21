"use client";

/**
 * Design-phone progress: 3 segmenten (teal fill).
 * Welcome/intro uitgesloten; geen dikke voortgangsbalk.
 */
export default function V2ProgressDots({
  step,
  total,
  showLabel = false,
}: {
  step: number;
  total: number;
  /** Optioneel "Stap x van y"; design-mock toont alleen segmenten. */
  showLabel?: boolean;
}) {
  const safeTotal = Math.max(1, total);
  const safeStep = Math.min(Math.max(0, step), safeTotal);
  const filled = Math.max(0, safeStep);

  return (
    <div
      className="v2-progress-dots"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-valuenow={Math.max(1, filled)}
      aria-label={`Stap ${Math.max(1, filled)} van ${safeTotal}`}
    >
      <div className="v2-progress-dots__row" aria-hidden="true">
        {Array.from({ length: safeTotal }, (_, i) => (
          <span
            key={i}
            className={`v2-progress-dots__dot${i < filled ? " is-on" : ""}`}
          />
        ))}
      </div>
      {showLabel ? (
        <p className="v2-progress-dots__label">
          Stap {Math.max(1, filled)} van {safeTotal}
        </p>
      ) : null}
    </div>
  );
}
