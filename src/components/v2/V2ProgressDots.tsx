"use client";

import { useI18n } from "@/lib/i18n/I18nContext";

/**
 * Design-phone progress: segmenten (teal fill).
 * Geen dikke voortgangsbalk.
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
  const { t } = useI18n();
  const safeTotal = Math.max(1, total);
  const safeStep = Math.min(Math.max(0, step), safeTotal);
  const filled = Math.max(0, safeStep);
  const stepLabel = t("v2.chromeProgressStep", {
    step: String(Math.max(1, filled)),
    total: String(safeTotal),
  });

  return (
    <div
      className="v2-progress-dots"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-valuenow={Math.max(1, filled)}
      aria-label={stepLabel}
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
        <p className="v2-progress-dots__label">{stepLabel}</p>
      ) : null}
    </div>
  );
}
