"use client";

import { ReactNode } from 'react';
import { useSidebar } from '../../contexts/SidebarContext';
import Sidebar from '../Sidebar';
import { ToastHost } from '../Toast';

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean; // Voor Focus Mode - verberg sidebar volledig
}

export default function AppLayout({ children, hideSidebar = false }: AppLayoutProps) {
  const { collapsed, toggleSidebar } = useSidebar();

  // Zen-modus: geen sidebar, volledig scherm
  if (hideSidebar) {
    return (
      <div style={{ width: '100%', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
        <ToastHost />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      <Sidebar collapsed={collapsed} />
      
      {/* Toggle knop – net rechts van de sidebar, overlapt nooit menu-items */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 z-40 p-2 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
        style={{
          left: collapsed ? '4.5rem' : '17rem',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'left'
        }}
        title={collapsed ? 'Menu uitklappen' : 'Menu inklappen'}
      >
        <span className="text-gray-600 font-medium">
          {collapsed ? '→' : '←'}
        </span>
      </button>
      
      <main
        className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden p-6"
      >
        {children}
      </main>
      
      {/* Toast notificaties */}
      <ToastHost />
    </div>
  );
}
