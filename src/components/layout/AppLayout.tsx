"use client";

import { ReactNode } from 'react';
import { useSidebar } from '../../contexts/SidebarContext';
import Sidebar from '../Sidebar';
import { ToastHost } from '../Toast';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <div className="flex h-screen bg-slate-50" style={{ width: '100%', height: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      
      {/* Toggle knop */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
        style={{ 
          left: collapsed ? '4.5rem' : '16.5rem',
          transition: 'left 0.3s ease'
        }}
        title={collapsed ? 'Menu uitklappen' : 'Menu inklappen'}
      >
        <span className="text-gray-600 font-medium">
          {collapsed ? '→' : '←'}
        </span>
      </button>
      
      <main className="flex-1 overflow-y-auto p-6" style={{ 
        minWidth: 0,
        width: '100%',
        marginLeft: collapsed ? '4rem' : '16rem',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </main>
      
      {/* Toast notificaties */}
      <ToastHost />
    </div>
  );
}
