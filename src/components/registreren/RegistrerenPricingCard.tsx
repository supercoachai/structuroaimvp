"use client";

import type { RegisterPlan } from "@/lib/stripe/registerPlans";

function PriceCheckIcon() {
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
      className="shrink-0 text-emerald-500"
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

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`relative flex h-full w-full flex-col justify-between rounded-[20px] border px-7 py-8 text-left transition-all duration-200 ${
        selected
          ? "border-blue-600 bg-blue-50 shadow-[0_0_0_4px_rgba(37,99,235,0.08),0_16px_40px_rgba(37,99,235,0.10)] hover:-translate-y-0.5 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.10),0_20px_44px_rgba(37,99,235,0.14)]"
          : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
      }`}
    >
      {plan.highlight ? (
        <div className="absolute -top-3 right-[22px] rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {t("registrerenPage.bestDealBadge")}
        </div>
      ) : null}

      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          {t(`registrerenPage.${plan.labelKey}`)}
        </div>

        <div className="mt-2.5 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-slate-900">
          {t(`registrerenPage.${plan.amountKey}`)}
          <span className="ml-1 text-base font-medium text-slate-500">
            {t(`registrerenPage.${plan.periodKey}`)}
          </span>
        </div>

        {isYearly ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">
              {t(`registrerenPage.${plan.subKey}`)}
            </span>
            <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {t("registrerenPage.yearlySave")}
            </span>
          </div>
        ) : (
          <div className="mt-1 text-sm text-slate-500">
            {t(`registrerenPage.${plan.subKey}`)}
          </div>
        )}
      </div>

      <ul className="mt-[22px] flex list-none flex-col gap-2.5 p-0">
        {plan.featureKeys.map((featKey) => (
          <li key={featKey} className="flex items-center gap-2.5 text-sm text-slate-900">
            <PriceCheckIcon />
            <span>{t(`registrerenPage.${featKey}`)}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
