"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useSidebar } from "@/contexts/SidebarContext";
import { isActiveMainAppPath, useMainAppTabs } from "@/components/navigation/mainAppNav";

type DesktopSidebarNavProps = {
  disabled?: boolean;
};

export default function DesktopSidebarNav({ disabled = false }: DesktopSidebarNavProps) {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();
  const tabs = useMainAppTabs();
  const { sidebarOpen } = useSidebar();

  return (
    <aside
      className={`hidden shrink-0 overflow-hidden border-r bg-[var(--st-bg)] transition-[width] duration-200 ease-out md:block ${
        sidebarOpen ? "w-[220px]" : "w-0 border-r-0"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      style={{ borderColor: "var(--st-line)" }}
      aria-label={t("layout.mainNavAria")}
      aria-hidden={!sidebarOpen}
      aria-disabled={disabled}
    >
      <div className="flex h-full w-[220px] flex-col pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav className="flex flex-1 flex-col px-3 pb-3">
          <p className="st-label mb-3 px-3 pb-1 pt-5">{t("layout.menuTitle")}</p>
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const active = isActiveMainAppPath(pathname, tab.href);
              const color = active ? "var(--st-blue)" : "var(--st-muted)";
              const Icon = tab.Icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  tabIndex={sidebarOpen ? undefined : -1}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--st-surface-2)]"
                  style={{
                    color,
                    background: active ? "var(--st-blue-haze)" : undefined,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate text-sm">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
