"use client";

import type { ComponentType } from "react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export function IconSun({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function IconTasks({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

export function IconTarget({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconShutdown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

export type MainAppTab = {
  id: string;
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export function isActiveMainAppPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function useMainAppTabs(): MainAppTab[] {
  const { t } = useI18n();
  return useMemo(
    () => [
      { id: "home", href: "/", label: t("tabs.home"), Icon: IconSun },
      { id: "taken", href: "/todo", label: t("tabs.tasks"), Icon: IconTasks },
      { id: "focus", href: "/focus", label: t("tabs.focus"), Icon: IconTarget },
      {
        id: "shutdown",
        href: "/shutdown",
        label: t("tabs.shutdown"),
        Icon: IconShutdown,
      },
    ],
    [t],
  );
}
