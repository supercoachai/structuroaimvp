"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { useSidebar } from '../../contexts/SidebarContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Sidebar from '../Sidebar';
import { ToastHost } from '../Toast';
import { clearDagstartCookieOnClient } from '@/lib/dagstartCookie';

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean; // Voor Focus Mode - verberg sidebar volledig
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const { collapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setMobileOpen(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // Geen actieve sessie, bijvoorbeeld bij lokale modus
    }
    document.cookie = 'structuro_local_mode=; path=/; max-age=0';
    clearDagstartCookieOnClient();
    router.push('/login');
    router.refresh();
  };

  // Zen-modus: geen sidebar, volledig scherm
  if (hideSidebar) {
    return (
      <div style={{ width: '100%', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
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
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
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
        className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pt-16 sm:pt-6"
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
