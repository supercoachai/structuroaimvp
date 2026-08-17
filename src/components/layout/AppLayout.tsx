"use client";

import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import BottomTabNav from "../navigation/BottomTabNav";
import DesktopSidebarNav from "../navigation/DesktopSidebarNav";
import QuickTaskInput from "@/components/QuickTaskInput";
import { performClientLogout } from "@/lib/logoutClient";
import { isDagstartDoneTodayClient } from "@/lib/dagstartCookie";
import { useSidebar } from "@/contexts/SidebarContext";
import { useI18n } from "@/lib/i18n";
import AnonymousAccountBanner from "@/components/account/AnonymousAccountBanner";
import AppShellSuspenseFallback from "@/components/shell/AppShellSuspenseFallback";
import { livePaths } from "@/lib/v2/livePaths";

type ShellState =
  | { status: "pending" }
  | { status: "ready"; dagstartDone: boolean };

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

/**
 * Legacy shell voor rest-routes die nog niet volledig in v2-shell zitten
 * (bijv. /notificaties). Nooit meer v1-DagstartOverlay: ontbrekende dagstart
 * bounce altijd naar canonieke `/dagstart`.
 */
export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dagstartQueryParam = searchParams?.get("dagstart") ?? null;
  const { t } = useI18n();
  const { sidebarOpen, toggleSidebar } = useSidebar();

  const [shell, setShell] = useState<ShellState>({ status: "pending" });
  const shellReady = shell.status === "ready";
  const dagstartDone = shell.status === "ready" ? shell.dagstartDone : null;

  useLayoutEffect(() => {
    const next = isDagstartDoneTodayClient();
    setShell((prev) => {
      if (prev.status === "ready" && prev.dagstartDone === next) return prev;
      return { status: "ready", dagstartDone: next };
    });
  }, [pathname]);

  /** Legacy `?dagstart=open` → canonieke v2-dagstart. */
  useEffect(() => {
    if (dagstartQueryParam !== "open") return;
    router.replace(livePaths.dagstart);
  }, [dagstartQueryParam, router]);

  useEffect(() => {
    const onUpdate = () => {
      const next = isDagstartDoneTodayClient();
      setShell((prev) => {
        if (prev.status === "ready" && prev.dagstartDone === next) return prev;
        return { status: "ready", dagstartDone: next };
      });
    };
    const onFocus = () => onUpdate();
    window.addEventListener("structuro_tasks_updated", onUpdate);
    window.addEventListener("focus", onFocus);
    const interval = setInterval(onUpdate, 30_000);
    return () => {
      window.removeEventListener("structuro_tasks_updated", onUpdate);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  const isFocusRoute = (pathname ?? "").startsWith("/focus");
  const isHomeRoute = pathname === "/";
  const isShutdownRoute = (pathname ?? "").startsWith("/shutdown");
  const isSettingsRoute = (pathname ?? "").startsWith("/settings");
  const shouldHideChrome = hideSidebar || isFocusRoute;
  const needsV2Dagstart = shellReady && dagstartDone !== true && !isSettingsRoute;

  /** Geen v1-overlay: stuur altijd naar v2 `/dagstart`. */
  useEffect(() => {
    if (!needsV2Dagstart) return;
    if ((pathname ?? "").startsWith(livePaths.dagstart)) return;
    router.replace(livePaths.dagstart);
  }, [needsV2Dagstart, pathname, router]);

  const handleLogout = async () => {
    await performClientLogout(router);
  };

  if (shouldHideChrome) {
    return (
      <div
        className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden pb-[var(--keyboard-inset-bottom)] ${
          isFocusRoute ? "bg-[var(--structuro-dark)]" : "bg-[var(--st-bg)]"
        }`}
      >
        <main
          className={
            isFocusRoute
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar"
          }
        >
          {children}
        </main>
        {!isFocusRoute ? (
          <button
            type="button"
            onClick={handleLogout}
            className="fixed right-5 z-50 rounded-xl bg-[var(--structuro-dark)] p-2.5 text-[var(--structuro-dark-sub)] shadow-lg transition-colors hover:bg-slate-800 hover:text-white bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+var(--keyboard-inset-bottom,0px)))]"
            title={t("layout.logout")}
            aria-label={t("layout.logout")}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    );
  }

  if (!shellReady || needsV2Dagstart) {
    return <AppShellSuspenseFallback />;
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden pb-[var(--keyboard-inset-bottom)] text-[var(--st-ink)] md:flex-row md:pb-0 bg-[var(--st-bg)]">
      <DesktopSidebarNav />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-[var(--st-line)] bg-[var(--st-bg)] px-6 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden shrink-0 items-center justify-start text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)] md:inline-flex md:h-10 md:w-6"
              aria-label={t("layout.toggleSidebar")}
              aria-expanded={sidebarOpen}
            >
              <Bars3Icon className="h-6 w-6" strokeWidth={1.75} />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <img
                src="/logo-structuro.png"
                alt="Structuro"
                className="h-9 w-9 shrink-0 rounded-2xl object-contain"
                width={36}
                height={36}
              />
              <span className="truncate text-lg font-semibold tracking-tight text-[var(--st-ink)]">
                Structuro
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/settings"
              className="inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 text-[var(--st-muted)] transition-colors hover:bg-[var(--st-surface-2)] hover:text-[var(--st-ink)]"
              aria-label={t("layout.settings")}
              title={t("layout.settings")}
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 text-[var(--st-muted)] transition-colors hover:bg-[var(--st-surface-2)] hover:text-[var(--st-ink)]"
              title={t("layout.logout")}
              aria-label={t("layout.logout")}
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        <AnonymousAccountBanner />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <div
              className={
                isHomeRoute || isShutdownRoute
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : `min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar ${
                      sidebarOpen ? "md:scroll-pb-0" : ""
                    }`
              }
            >
              {children}
            </div>
          </main>

          {!isShutdownRoute ? <QuickTaskInput /> : null}
        </div>

        <BottomTabNav className="md:hidden" />
      </div>
    </div>
  );
}
