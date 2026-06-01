"use client";

import type { RegisterPlan } from "@/lib/stripe/registerPlans";

function PriceCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-emerald-500 ${className ?? ""}`}
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function RegistrerenPricingCard({
  plan,
  selected,
  onSelect,
  t,
}: {
  plan: RegisterPlan;
  selected: boolean;
  onSelect: (plan: RegisterPlan) => void;
  t: (key: string) => string;
}) {
  const isYearly = plan.id === "yearly";

  const cardShadow = selected
    ? "shadow-[0_0_0_4px_rgba(37,99,235,0.08),0_16px_40px_rgba(37,99,235,0.10)]"
    : "shadow-[0_0_0_4px_transparent,0_1px_2px_rgba(15,23,42,0.06)]";

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`relative flex h-full w-full min-w-0 flex-col rounded-2xl border px-3 py-4 text-left transition-all duration-200 sm:rounded-[20px] sm:px-5 sm:py-5 lg:px-7 lg:py-6 ${cardShadow} ${
        selected
          ? "border-blue-600 bg-blue-50 hover:-translate-y-0.5 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.10),0_20px_44px_rgba(37,99,235,0.14)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.04),0_12px_32px_rgba(15,23,42,0.08)]"
      }`}
    >
      {plan.highlight ? (
        <div className="absolute -top-2.5 right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:-top-3 sm:right-4 sm:px-3 sm:py-1 sm:text-[11px] lg:right-[22px]">
          {t("registrerenPage.bestDealBadge")}
        </div>
      ) : null}

      <div className="flex flex-col">
        {isYearly ? (
          <div className="flex h-3 items-end text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:h-3.5 sm:text-xs lg:h-[18px] lg:text-[13px] lg:tracking-[0.1em]">
            {t(`registrerenPage.${plan.labelKey}`)}
          </div>
        ) : null}

        <div
          className={`flex min-h-[1.75rem] items-end whitespace-nowrap text-[1.5rem] font-extrabold leading-none tracking-[-0.03em] text-slate-900 sm:min-h-[2rem] sm:text-[2rem] lg:min-h-[44px] lg:text-[44px] ${
            isYearly ? "mt-1.5 sm:mt-2" : ""
          }`}
        >
          {t(`registrerenPage.${plan.amountKey}`)}
          <span className="ml-0.5 text-[10px] font-medium text-slate-500 sm:ml-1 sm:text-sm lg:text-base">
            {t(`registrerenPage.${plan.periodKey}`)}
          </span>
        </div>

        <div
          className={`mt-2 flex min-h-[14px] items-center sm:mt-3.5 sm:min-h-[18px] ${
            isYearly ? "gap-1 flex-nowrap" : ""
          }`}
        >
          <span className="shrink-0 whitespace-nowrap text-[9px] leading-none text-slate-500 sm:text-sm">
            {isYearly ? (
              <>
                {t("registrerenPage.yearlyEffectiveCompact")}
                <span className="hidden sm:inline"> effectief</span>
              </>
            ) : (
              t(`registrerenPage.${plan.subKey}`)
            )}
          </span>
          {isYearly ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold leading-none text-emerald-700 sm:px-2 sm:text-[10px] lg:px-2.5 lg:text-xs">
              {t("registrerenPage.yearlySave")}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mt-2 flex w-full list-none flex-col gap-1.5 p-0 sm:mt-3.5 sm:gap-2">
        {plan.featureKeys.map((featKey) => (
          <li
            key={featKey}
            className="grid w-full grid-cols-[12px_minmax(0,1fr)] items-start gap-x-1.5 text-[10px] leading-snug text-slate-900 sm:grid-cols-[16px_minmax(0,1fr)] sm:gap-x-2.5 sm:text-sm"
          >
            <PriceCheckIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{t(`registrerenPage.${featKey}`)}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
