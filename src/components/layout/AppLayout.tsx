"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState, startTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { ToastHost } from '../Toast';
import BottomTabNav from '../navigation/BottomTabNav';
import DesktopSidebarNav from '../navigation/DesktopSidebarNav';
import QuickTaskInput from '@/components/QuickTaskInput';
import dynamic from 'next/dynamic';

const DagstartOverlay = dynamic(() => import('@/components/DagstartOverlay'), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1 bg-[#F1F3F8]" aria-hidden />,
});
import { performClientLogout } from '@/lib/logoutClient';
import { isDagstartDoneTodayClient, setDagstartCookieOnClient } from '@/lib/dagstartCookie';
import { useSidebar } from '@/contexts/SidebarContext';
import { useI18n } from '@/lib/i18n';

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useSidebar();

  /** Server en eerste client-render gelijk houden; echte waarden komen uit useLayoutEffect. */
  const [shellReady, setShellReady] = useState(false);
  const [dagstartDone, setDagstartDone] = useState<boolean | null>(null);
  const [dagstartPhase, setDagstartPhase] = useState<'energy' | 'tasks' | null>(null);
  const wasDagstartDoneRef = useRef(true);

  useLayoutEffect(() => {
    const next = isDagstartDoneTodayClient();
    setDagstartDone((prev) => (prev === next ? prev : next));
    setShellReady(true);
  }, [pathname]);

  useEffect(() => {
    /**
     * Detecteer dagovergangen (cookie verloopt om middernacht) en externe wijzigingen
     * in tabs/devices, zonder agressief te pollen. Event listener doet het primaire werk,
     * de fallback-interval (30s) vangt edge-cases af waar het event niet vuurt.
     */
    const onUpdate = () => setDagstartDone(isDagstartDoneTodayClient());
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
  const shouldHideChrome = hideSidebar || isFocusRoute;
  const inDagstartFlow = dagstartDone !== true;
  const showSidebar = shellReady && dagstartDone === true;
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
      setDagstartDone(true);
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
        <ToastHost />
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

  const showDagstartOverlay = shellReady && dagstartDone === false;
  const showMainContent = shellReady && dagstartDone === true;
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
            {dagstartDone === true ? (
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main
            className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden ${
              inDagstartFlow ? 'max-md:justify-center' : ''
            }`}
          >
            {!shellReady ? (
              <div className="min-h-0 flex-1 bg-[#F1F3F8]" aria-hidden />
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
            ) : null}
          </main>

          {!mainNavLocked && !isShutdownRoute ? <QuickTaskInput /> : null}
        </div>

        {!mainNavLocked ? <BottomTabNav className="md:hidden" /> : null}

        <ToastHost />
      </div>
    </div>
  );
}
