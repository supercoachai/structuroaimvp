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
import TodoParkThoughtBar from '@/components/TodoParkThoughtBar';
import { performClientLogout } from '@/lib/logoutClient';
import { isDagstartDoneTodayClient } from '@/lib/dagstartCookie';
import {
  FIRST_DAGSTART_AFTER_ONBOARDING_KEY,
  FIRST_DAGSTART_AFTER_ONBOARDING_CLEARED,
  clearFirstDagstartAfterOnboarding,
} from '@/lib/firstDagstartSession';

let appLayoutPreviousPathname: string | null = null;

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [dagstartDone, setDagstartDone] = useState(() =>
    typeof document !== 'undefined' ? isDagstartDoneTodayClient() : false
  );
  const [minimalFirstDagstart, setMinimalFirstDagstart] = useState(false);

  useEffect(() => {
    const prev = appLayoutPreviousPathname;
    if (prev === '/dagstart' && pathname !== '/dagstart') {
      try {
        if (localStorage.getItem(FIRST_DAGSTART_AFTER_ONBOARDING_KEY) === '1') {
          clearFirstDagstartAfterOnboarding();
        }
      } catch {
        /* ignore */
      }
    }
    appLayoutPreviousPathname = pathname;
  }, [pathname]);

  useLayoutEffect(() => {
    if (pathname !== '/dagstart') {
      setMinimalFirstDagstart(false);
      return;
    }
    const readFlag = () => {
      try {
        setMinimalFirstDagstart(
          localStorage.getItem(FIRST_DAGSTART_AFTER_ONBOARDING_KEY) === '1'
        );
      } catch {
        setMinimalFirstDagstart(false);
      }
    };
    readFlag();
    window.addEventListener(FIRST_DAGSTART_AFTER_ONBOARDING_CLEARED, readFlag);
    return () => {
      window.removeEventListener(FIRST_DAGSTART_AFTER_ONBOARDING_CLEARED, readFlag);
    };
  }, [pathname]);

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

  const shouldHideChrome =
    hideSidebar ||
    !dagstartDone ||
    (pathname === '/dagstart' && minimalFirstDagstart) ||
    isFocusRoute;

  const handleLogout = async () => {
    await performClientLogout(router);
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
            title="Uitloggen"
            aria-label="Uitloggen"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="box-border flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--structuro-bg)] pb-[var(--keyboard-inset-bottom)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/Logo Structuro.png"
            alt=""
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
            aria-label="Instellingen"
            title="Instellingen"
          >
            <Cog6ToothIcon className="h-6 w-6" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl p-2.5 text-[var(--structuro-sub)] transition-colors hover:bg-[var(--structuro-border-soft)] hover:text-[var(--structuro-text)]"
            title="Uitloggen"
            aria-label="Uitloggen"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overflow-x-hidden scroll-pb-[var(--keyboard-inset-bottom)] no-scrollbar">
        {children}
      </main>

      {(pathname ?? '') === '/' ? <TodoParkThoughtBar /> : null}

      <BottomTabNav />

      <ToastHost />
    </div>
  );
}
