"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'sidebar_open';

function readSidebarOpenFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeSidebarOpenToStorage(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, open ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

interface SidebarContextType {
  /** Desktop sidebar uitgeklapt (standaard ingeklapt). */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean, options?: { persist?: boolean }) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpenState] = useState(false);

  useLayoutEffect(() => {
    setSidebarOpenState(readSidebarOpenFromStorage());
  }, []);

  const setSidebarOpen = useCallback((open: boolean, options?: { persist?: boolean }) => {
    setSidebarOpenState(open);
    if (options?.persist !== false) {
      writeSidebarOpenToStorage(open);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      writeSidebarOpenToStorage(next);
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
