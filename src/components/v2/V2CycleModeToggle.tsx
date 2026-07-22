"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Compacte segmented bar: cyclus aan/uit op de eerste dagstart.
 * Visueel licht; de pagina (orb + fase) transformeert via cyclusOptIn.
 */
export default function V2CycleModeToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="v2-cycle-mode" role="group" aria-label={t("v2.cycleModeAria")}>
      <button
        type="button"
        className={`v2-cycle-mode__opt${!on ? " is-active" : ""}`}
        aria-pressed={!on}
        onClick={() => onChange(false)}
      >
        {t("v2.cycleModeOff")}
      </button>
      <button
        type="button"
        className={`v2-cycle-mode__opt${on ? " is-active" : ""}`}
        aria-pressed={on}
        onClick={() => onChange(true)}
      >
        {t("v2.cycleModeOn")}
      </button>
    </div>
  );
}
