'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'structuro_theme';

function getStored(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(preference: ThemePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (preference === 'light') {
    root.classList.add('light');
  } else if (preference === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add(prefersDark() ? 'dark' : 'light');
  }
}

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  effectiveDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [effectiveDark, setEffectiveDark] = useState(false);

  const setTheme = useCallback((value: ThemePreference) => {
    setThemeState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
      applyTheme(value);
      setEffectiveDark(
        value === 'dark' || (value === 'system' && prefersDark())
      );
    }
  }, []);

  useEffect(() => {
    const stored = getStored();
    setThemeState(stored);
    applyTheme(stored);
    setEffectiveDark(stored === 'dark' || (stored === 'system' && prefersDark()));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (getStored() === 'system') {
        applyTheme('system');
        setEffectiveDark(prefersDark());
      }
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        effectiveDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
