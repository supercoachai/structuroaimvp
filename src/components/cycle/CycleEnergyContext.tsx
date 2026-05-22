"use client";

import { ChevronDownIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { getCycleEnergyContext } from "@/lib/cycle/cycleDisplayContext";
import type { CycleProfile } from "@/lib/cycle/types";

export type CycleEnergyContextProps = {
  consentOn: boolean;
  profile: CycleProfile;
};

/** Passieve cyclus-info onder het dagstart-kopje. Inklapbaar met extra uitleg voor energiekeuze. */
export default function CycleEnergyContext({
  consentOn,
  profile,
}: CycleEnergyContextProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const ctx = useMemo(
    () => getCycleEnergyContext(consentOn, profile),
    [consentOn, profile]
  );

  if (ctx.kind === "none") return null;

  const headline =
    ctx.kind === "active_only"
      ? t("cycle.energyContextTrackingActive")
      : t("cycle.energyContextHeadline", {
          day: String(ctx.dayInCycle),
          phase: t(`cycle.energyContextPhase_${ctx.displayPhase}`),
        });

  const body =
    ctx.kind === "full"
      ? t(`cycle.energyContextBody_${ctx.displayPhase}`)
      : null;

  const tip =
    ctx.kind === "full"
      ? t(`cycle.energyContextTip_${ctx.displayPhase}`)
      : t("cycle.energyContextTip_active_only");

  const expandLabel = expanded
    ? t("cycle.energyContextCollapseAria")
    : t("cycle.energyContextExpandAria");

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expandLabel}
      onClick={() => setExpanded((open) => !open)}
      className="flex w-full items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-left text-sm leading-relaxed text-slate-700 shadow-sm transition-colors hover:bg-amber-50"
    >
      <MoonIcon
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600/80"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium text-slate-800">{headline}</p>
        {expanded ? (
          <>
            {body ? <p className="text-slate-600">{body}</p> : null}
            <p className="text-slate-600">{tip}</p>
          </>
        ) : null}
      </div>
      <ChevronDownIcon
        className={`mt-0.5 h-5 w-5 shrink-0 text-amber-600/80 transition-transform duration-200 ${
          expanded ? "rotate-180" : ""
        }`}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}
