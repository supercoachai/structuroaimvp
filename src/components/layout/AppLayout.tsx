"use client";

import { ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { ToastHost } from '../Toast';
import BottomTabNav from '../navigation/BottomTabNav';
import QuickTaskInput from '@/components/QuickTaskInput';
import DagstartOverlay from '@/components/DagstartOverlay';
import { performClientLogout } from '@/lib/logoutClient';
import { getClockHourAmsterdam, isDagstartDoneTodayClient } from '@/lib/dagstartCookie';
import { useI18n } from '@/lib/i18n';

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  /** Altijd false bij eerste render (SSR + hydrate): geen document/cookie-branch, anders hydration mismatch. Sync in useLayoutEffect. */
  const [dagstartDone, setDagstartDone] = useState(false);
  const [showWindDownBanner, setShowWindDownBanner] = useState(false);

  useEffect(() => {
    const tick = () => {
      const h = getClockHourAmsterdam();
      setShowWindDownBanner(h >= 17 && h < 24);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  /** Direct na mount en bij route-wissel: voorkomt dat tab-nav even (of blijvend) verdwijnt op mobiel door useEffect-lat. */
  useLayoutEffect(() => {
    setDagstartDone(isDagstartDoneTodayClient());
  }, [pathname]);

  useEffect(() => {
    const onUpdate = () => setDagstartDone(isDagstartDoneTodayClient());
    window.addEventListener('structuro_tasks_updated', onUpdate);
    const interval = setInterval(onUpdate, 2000);
    return () => {
      window.removeEventListener('structuro_tasks_updated', onUpdate);
      clearInterval(interval);
    };
  }, []);

  /** Focus: fullscreen donker scherm; geen tab-balk (doctrine). */
  const isFocusRoute = (pathname ?? '').startsWith('/focus');

  /** Alleen focus / expliciet verbergen: geen shell. Dagstart: shell wél, overlay + tabs disabled tot cookie. */
  const shouldHideChrome = hideSidebar || isFocusRoute;

  const mainNavLocked = !dagstartDone;

  const handleLogout = async () => {
    await performClientLogout(router);
  };

  const handleDagstartComplete = () => {
    setDagstartDone(isDagstartDoneTodayClient());
    router.refresh();
  };

  if (shouldHideChrome) {
    return (
      <div
        className={`box-border flex h-[100dvh] w-full flex-col overflow-hidden pb-[var(--keyboard-inset-bottom)] ${isFocusRoute ? 'bg-[var(--structuro-dark)]' : 'bg-[var(--structuro-bg)]'}`}
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

  const showDagstartOverlay = !dagstartDone;

  return (
    <div
      className={`box-border flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--structuro-bg)] pb-[var(--keyboard-inset-bottom)] ${mainNavLocked ? 'overflow-hidden' : ''}`}
    >
      {showDagstartOverlay ? (
        <DagstartOverlay onComplete={handleDagstartComplete} />
      ) : null}

      {/** Geen aparte app-header boven de dagstart: die overlay is zelfstandig; anders valt de titel visueel achter de balk. */}
      {!showDagstartOverlay ? (
      <header
        className={`flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm ${
          mainNavLocked ? 'relative z-[110] pointer-events-none opacity-50' : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/logo-structuro.png"
            alt="Structuro"
            className="h-9 w-9 shrink-0 rounded-2xl object-contain"
            width={36}
            height={36}
          />
          <span className="truncate text-lg font-semibold tracking-tight text-[var(--structuro-text)]">
            Structuro
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/settings"
            className="rounded-xl p-2.5 text-[var(--structuro-sub)] transition-colors hover:bg-[var(--structuro-border-soft)] hover:text-[var(--structuro-text)]"
            aria-label={t('layout.settings')}
            title={t('layout.settings')}
          >
            <Cog6ToothIcon className="h-6 w-6" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl p-2.5 text-[var(--structuro-sub)] transition-colors hover:bg-[var(--structuro-border-soft)] hover:text-[var(--structuro-text)]"
            title={t('layout.logout')}
            aria-label={t('layout.logout')}
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </header>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col ${mainNavLocked ? "relative z-[5]" : ""}`}
      >
        {showWindDownBanner && !mainNavLocked && (pathname ?? "") !== "/shutdown" ? (
          <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-center">
            <Link
              href="/shutdown"
              className="inline-flex flex-wrap items-center justify-center gap-x-1.5 text-sm font-medium text-amber-950 underline-offset-2 hover:underline"
            >
              <span>{t('layout.windDownBanner')}</span>
              <span aria-hidden>→</span>
              <span className="font-semibold">{t('layout.windDownBannerCta')}</span>
            </Link>
          </div>
        ) : null}
        <main className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar">
          {children}
        </main>

        {!mainNavLocked ? <QuickTaskInput /> : null}
      </div>

      <BottomTabNav disabled={mainNavLocked} />

      <ToastHost />
    </div>
  );
}
