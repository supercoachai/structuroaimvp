"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { isActiveMainAppPath, useMainAppTabs } from "@/components/navigation/mainAppNav";

type BottomTabNavProps = {
  disabled?: boolean;
  className?: string;
};

export default function BottomTabNav({ disabled = false, className = "" }: BottomTabNavProps) {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();
  const tabs = useMainAppTabs();

  return (
    <nav
      className={`structuro-bottom-nav shrink-0 border-t bg-[var(--st-bg)] px-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 max-[380px]:px-1 max-[380px]:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-[380px]:pt-1.5 md:hidden ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className}`.trim()}
      style={{ borderColor: "var(--st-line)" }}
      aria-label={t("layout.mainNavAria")}
      aria-disabled={disabled}
    >
      {tabs.map((tab) => {
        const active = isActiveMainAppPath(pathname, tab.href);
        const color = active ? "var(--st-blue)" : "var(--st-muted)";
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 max-[380px]:min-h-[40px] max-[380px]:py-0.5"
            style={{ color }}
          >
            <Icon className="shrink-0 max-[380px]:scale-90" />
            <span className="w-full text-center text-[10px] font-semibold leading-[1.15] tracking-wide max-[380px]:text-[9px]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
