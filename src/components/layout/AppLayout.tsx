"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useSidebar } from '../../contexts/SidebarContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Sidebar from '../Sidebar';
import { ToastHost } from '../Toast';
import { performClientLogout } from '@/lib/logoutClient';
import {
  STRUCTURO_DAGSTART_COOKIE,
  getCalendarDateAmsterdam,
  decodeDagstartCookieValue,
} from '@/lib/dagstartCookie';

function isDagstartDoneToday(): boolean {
  if (typeof document === 'undefined') return false;
  const cookies = document.cookie.split(';');
  for (const c of cookies) {
    const [key, val] = c.trim().split('=');
    if (key === STRUCTURO_DAGSTART_COOKIE) {
      return decodeDagstartCookieValue(val) === getCalendarDateAmsterdam();
    }
  }
  return false;
}

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const { collapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const router = useRouter();

  const [dagstartDone, setDagstartDone] = useState(false);

  useEffect(() => {
    setDagstartDone(isDagstartDoneToday());

    const onUpdate = () => setDagstartDone(isDagstartDoneToday());
    window.addEventListener('structuro_tasks_updated', onUpdate);
    const interval = setInterval(onUpdate, 2000);
    return () => {
      window.removeEventListener('structuro_tasks_updated', onUpdate);
      clearInterval(interval);
    };
  }, []);

  const shouldHideSidebar = hideSidebar || !dagstartDone;

  const handleLogout = async () => {
    setMobileOpen(false);
    await performClientLogout(router);
  };

  if (shouldHideSidebar) {
    return (
      <div className="w-full h-[100dvh] flex flex-col overflow-hidden">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <ToastHost />
        <button
          type="button"
          onClick={handleLogout}
          className="fixed bottom-5 right-5 z-50 p-2.5 rounded-xl bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors shadow-lg"
          title="Uitloggen"
          aria-label="Uitloggen"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-gray-50 overflow-hidden">
      {/* Sidebar: op mobiel als overlay, anders normaal */}
      <div
        className={isMobile ? 'fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-out' : 'relative z-10 flex-shrink-0'}
        style={isMobile ? {
          width: 'min(280px, 85vw)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        } : undefined}
      >
        <Sidebar collapsed={isMobile ? false : collapsed} onNavigate={isMobile ? () => setMobileOpen(false) : undefined} />
      </div>

      {/* Backdrop op mobiel wanneer menu open */}
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Menu sluiten"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 transition-opacity"
        />
      )}

      {/* Menu-knop: hamburger op mobiel, pijl op desktop */}
      <button
        onClick={() => isMobile ? setMobileOpen(!mobileOpen) : toggleSidebar()}
        className="fixed top-4 z-40 p-2.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow touch-manipulation"
        style={{
          left: isMobile ? 16 : collapsed ? '4.5rem' : '17rem',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'left',
        }}
        title={isMobile ? (mobileOpen ? 'Menu sluiten' : 'Menu openen') : (collapsed ? 'Menu uitklappen' : 'Menu inklappen')}
      >
        {isMobile ? (
          <span className="block w-5 h-4 flex flex-col justify-between">
            <span className="block h-0.5 bg-gray-600 rounded-full" />
            <span className="block h-0.5 bg-gray-600 rounded-full" />
            <span className="block h-0.5 bg-gray-600 rounded-full" />
          </span>
        ) : (
          <span className="text-gray-600 font-medium">{collapsed ? '→' : '←'}</span>
        )}
      </button>

      <main
        className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden pt-14 sm:pt-0"
      >
        {children}
      </main>

      <ToastHost />

      {/* Uitloggen: klein icoon rechtsonder */}
      <button
        type="button"
        onClick={handleLogout}
        className="fixed bottom-5 right-5 z-50 p-2.5 rounded-xl bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors shadow-lg"
        title="Uitloggen"
        aria-label="Uitloggen"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
