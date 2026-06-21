"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState, startTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import BottomTabNav from '../navigation/BottomTabNav';
import DesktopSidebarNav from '../navigation/DesktopSidebarNav';
import QuickTaskInput from '@/components/QuickTaskInput';
import dynamic from 'next/dynamic';
import { performClientLogout } from '@/lib/logoutClient';
import { isDagstartDoneTodayClient, setDagstartCookieOnClient } from '@/lib/dagstartCookie';
import { useSidebar } from '@/contexts/SidebarContext';
import { useI18n } from '@/lib/i18n';
import { TrialBanner } from '@/components/TrialBanner';
import AnonymousAccountBanner from '@/components/account/AnonymousAccountBanner';
import AppShellSuspenseFallback from '@/components/shell/AppShellSuspenseFallback';

const DagstartOverlay = dynamic(
  () =>
    import('@/components/DagstartOverlay').then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => <AppShellSuspenseFallback />,
  }
);

type ShellState =
  | { status: "pending" }
  | { status: "ready"; dagstartDone: boolean };

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useSidebar();

  /** Atomische shell-state: geen frame met lege main (wit scherm). */
  const [shell, setShell] = useState<ShellState>({ status: "pending" });
  const shellReady = shell.status === "ready";
  const dagstartDone = shell.status === "ready" ? shell.dagstartDone : null;
  const [dagstartPhase, setDagstartPhase] = useState<'energy' | 'tasks' | null>(null);
  const wasDagstartDoneRef = useRef(true);

  useLayoutEffect(() => {
    const next = isDagstartDoneTodayClient();
    setShell((prev) => {
      if (prev.status === "ready" && prev.dagstartDone === next) return prev;
      return { status: "ready", dagstartDone: next };
    });
  }, [pathname]);

  useEffect(() => {
    /**
     * Detecteer dagovergangen (cookie verloopt om middernacht) en externe wijzigingen
     * in tabs/devices, zonder agressief te pollen. Event listener doet het primaire werk,
     * de fallback-interval (30s) vangt edge-cases af waar het event niet vuurt.
     */
    const onUpdate = () => {
      const next = isDagstartDoneTodayClient();
      setShell((prev) => {
        if (prev.status === "ready" && prev.dagstartDone === next) return prev;
        return { status: "ready", dagstartDone: next };
      });
    };
    const onFocus = () => onUpdate();
    window.addEventListener('structuro_tasks_updated', onUpdate);
    window.addEventListener('focus', onFocus);
    const interval = setInterval(onUpdate, 30_000);
    return () => {
      window.removeEventListener('structuro_tasks_updated', onUpdate);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  const isFocusRoute = (pathname ?? '').startsWith('/focus');
  const isHomeRoute = pathname === '/';
  const isShutdownRoute = (pathname ?? '').startsWith('/shutdown');
  /** Instellingen altijd bereikbaar, ook vóór dagstart vandaag. */
  const isSettingsRoute = (pathname ?? '').startsWith('/settings');
  const shouldHideChrome = hideSidebar || isFocusRoute;
  const dagstartBlocksShell = dagstartDone !== true && !isSettingsRoute;
  const inDagstartFlow = dagstartBlocksShell;
  const showSidebar = shellReady && !dagstartBlocksShell;
  const mainNavLocked = inDagstartFlow;

  /** Bij start dagstart: sidebar ingeklapt zonder localStorage te overschrijven. */
  useLayoutEffect(() => {
    if (!shellReady) return;
    if (wasDagstartDoneRef.current && dagstartDone === false) {
      setSidebarOpen(false, { persist: false });
    }
    wasDagstartDoneRef.current = dagstartDone === true;
  }, [shellReady, dagstartDone, setSidebarOpen]);

  const handleLogout = async () => {
    await performClientLogout(router);
  };

  const handleDagstartComplete = () => {
    setDagstartCookieOnClient();
    setDagstartPhase(null);
    startTransition(() => {
      setShell({ status: "ready", dagstartDone: true });
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("structuro_checkin_updated"));
    }
    requestAnimationFrame(() => {
      router.refresh();
    });
  };

  if (shouldHideChrome) {
    return (
      <div
        className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden pb-[var(--keyboard-inset-bottom)] ${
          isFocusRoute ? 'bg-[var(--structuro-dark)]' : 'bg-[var(--st-bg)]'
        }`}
      >
        <main
          className={
            isFocusRoute
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar'
          }
        >
          {children}
        </main>
        {!isFocusRoute ? (
          <button
            type="button"
            onClick={handleLogout}
            className="fixed right-5 z-50 rounded-xl bg-[var(--structuro-dark)] p-2.5 text-[var(--structuro-dark-sub)] shadow-lg transition-colors hover:bg-slate-800 hover:text-white bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+var(--keyboard-inset-bottom,0px)))]"
            title={t('layout.logout')}
            aria-label={t('layout.logout')}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    );
  }

  const showDagstartOverlay = shellReady && dagstartBlocksShell;
  const showMainContent = shellReady && !dagstartBlocksShell;
  const hideTopbarLogo = inDagstartFlow && dagstartPhase !== 'tasks';

  return (
    <div
      className={`flex h-full min-h-0 w-full overflow-hidden text-[var(--st-ink)] md:flex-row ${
        inDagstartFlow
          ? 'pb-0 md:pb-[var(--keyboard-inset-bottom)]'
          : 'pb-[var(--keyboard-inset-bottom)] md:pb-0'
      } ${
        inDagstartFlow ? 'bg-[#F1F3F8]' : 'bg-[var(--st-bg)]'
      }`}
    >
      {showSidebar ? <DesktopSidebarNav disabled={mainNavLocked} /> : null}

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          inDagstartFlow ? 'bg-[#F1F3F8]' : ''
        }`}
      >
        <header
          className={`${inDagstartFlow ? 'hidden md:flex' : 'flex'} w-full shrink-0 items-center justify-between gap-3 px-6 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-12 ${
            inDagstartFlow
              ? 'border-b border-transparent bg-[#F1F3F8]'
              : 'border-b border-[var(--st-line)] bg-[var(--st-bg)]'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showSidebar ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden shrink-0 items-center justify-start text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink)] md:inline-flex md:h-10 md:w-6"
                aria-label={t('layout.toggleSidebar')}
                aria-expanded={sidebarOpen}
              >
                <Bars3Icon className="h-6 w-6" strokeWidth={1.75} />
              </button>
            ) : null}

            <div className="flex min-w-0 items-center gap-2">
              {!hideTopbarLogo ? (
                <img
                  src="/logo-structuro.png"
                  alt="Structuro"
                  className="h-9 w-9 shrink-0 rounded-2xl object-contain"
                  width={36}
                  height={36}
                />
              ) : null}
              {!inDagstartFlow ? (
                <span className="truncate text-lg font-semibold tracking-tight text-[var(--st-ink)]">
                  Structuro
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!dagstartBlocksShell ? (
              <Link
                href="/settings"
                className="inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 text-[var(--st-muted)] transition-colors hover:bg-[var(--st-surface-2)] hover:text-[var(--st-ink)]"
                aria-label={t('layout.settings')}
                title={t('layout.settings')}
              >
                <Cog6ToothIcon className="h-6 w-6" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 text-[var(--st-muted)] transition-colors hover:bg-[var(--st-surface-2)] hover:text-[var(--st-ink)]"
              title={t('layout.logout')}
              aria-label={t('layout.logout')}
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        {showMainContent ? <TrialBanner /> : null}
        {showMainContent ? <AnonymousAccountBanner /> : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main
            className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden ${
              inDagstartFlow ? 'max-md:justify-center' : ''
            }`}
          >
            {!shellReady ? (
              <AppShellSuspenseFallback />
            ) : showDagstartOverlay ? (
              <DagstartOverlay
                onComplete={handleDagstartComplete}
                onPhaseChange={setDagstartPhase}
              />
            ) : showMainContent ? (
              <div
                className={
                  isHomeRoute || isShutdownRoute
                    ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                    : `min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar ${
                        sidebarOpen ? 'md:scroll-pb-0' : ''
                      }`
                }
              >
                {children}
              </div>
            ) : (
              <AppShellSuspenseFallback />
            )}
          </main>

          {!mainNavLocked && !isShutdownRoute ? <QuickTaskInput /> : null}
        </div>

        {!mainNavLocked ? <BottomTabNav className="md:hidden" /> : null}
      </div>
    </div>
  );
}
