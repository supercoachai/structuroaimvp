'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  BellIcon,
  FireIcon,
  TrophyIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> | string;
  description: string;
  accent: string;
};

/** Kern-loop: rustig menu — eerst deze drie. */
const primaryNavItems: MenuItem[] = [
  { name: 'Dagstart', href: '/dagstart', icon: '🌅', description: 'Begin je dag', accent: '#f59e0b' },
  { name: 'Taken & Prioriteiten', href: '/todo', icon: ClipboardDocumentCheckIcon, description: 'Slimme takenlijst', accent: '#22c55e' },
  { name: 'Focus Modus', href: '/focus', icon: FireIcon, description: 'Concentratie hulp', accent: '#ea580c' },
];

/** Ondersteunend: standaard ingeklapt (expanded sidebar). */
const secondaryNavItems: MenuItem[] = [
  { name: 'Overzicht', href: '/', icon: HomeIcon, description: 'Dagelijkse planning', accent: '#3b82f6' },
  { name: 'Agenda & Planning', href: '/agenda', icon: CalendarIcon, description: 'Dagplanner', accent: '#6366f1' },
  { name: 'Herinneringen', href: '/notificaties', icon: BellIcon, description: 'Slimme alerts', accent: '#8b5cf6' },
  { name: 'Beloningen', href: '/gamification', icon: TrophyIcon, description: 'Motivatie & beloningen', accent: '#d97706' },
  { name: 'Uitleg', href: '/uitleg', icon: InformationCircleIcon, description: 'Hoe werkt het?', accent: '#3b82f6' },
  { name: 'Instellingen', href: '/settings', icon: Cog6ToothIcon, description: 'Persoonlijk', accent: '#6366f1' },
];

export default function Sidebar({ collapsed = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const isSecondaryRoute = secondaryNavItems.some((item) => item.href === pathname);

  useEffect(() => {
    if (isSecondaryRoute) setSecondaryOpen(true);
  }, [isSecondaryRoute, pathname]);

  const renderItem = (item: MenuItem) => {
    const isActive = pathname === item.href;
    const accent = item.accent || '#64748b';
    const IconComponent = typeof item.icon === 'string' ? null : item.icon;

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onNavigate}
        className={`relative flex items-center rounded-xl group transition-all duration-200 ${
          collapsed ? 'justify-center px-2 py-3' : 'pl-4 pr-3 py-3 space-x-3'
        } ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
        title={collapsed ? item.name : undefined}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-r-full flex-shrink-0"
            style={{ background: accent }}
          />
        )}

        <div
          className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
            collapsed ? 'w-10 h-10' : 'w-10 h-10 p-2'
          }`}
          style={{
            background: isActive ? `${accent}40` : 'rgba(255,255,255,0.06)',
          }}
        >
          {typeof item.icon === 'string' ? (
            <span className={collapsed ? 'text-xl' : 'text-lg'}>{item.icon}</span>
          ) : (
            IconComponent && (
              <IconComponent
                className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive ? '' : 'text-slate-400 group-hover:text-slate-200'}`}
                style={isActive ? { color: accent } : undefined}
              />
            )
          )}
        </div>

        <div
          className="flex-1 min-w-0"
          style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'opacity 0.2s, width 0.3s',
            whiteSpace: 'nowrap',
            marginLeft: collapsed ? 0 : 12,
          }}
        >
          <span
            className={`block font-medium text-sm transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-slate-400 group-hover:text-gray-200'
            }`}
          >
            {item.name}
          </span>
          <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 truncate transition-colors duration-200 sidebar-item-desc">
            {item.description}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div
      className={`relative z-10 flex-shrink-0 h-full shadow-sm bg-slate-900 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width',
      }}
    >
      <div className="flex flex-col h-full">
        <div
          className={`flex-shrink-0 ${collapsed ? 'p-4' : 'p-6 pb-6'}`}
          style={{ transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}
            style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="flex-shrink-0">
              <img
                src="/Logo Structuro.png"
                alt="Structuro Logo"
                className={`${collapsed ? 'w-9 h-9' : 'w-11 h-11'} object-contain`}
                style={{ transition: 'width 0.3s, height 0.3s' }}
              />
            </div>
            <div
              className="min-w-0"
              style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s, width 0.3s',
                whiteSpace: 'nowrap',
              }}
            >
              <h1 className="text-lg font-semibold text-white">Structuro</h1>
              <p className="text-xs text-slate-400 mt-0.5">Jouw houvast in chaos</p>
            </div>
          </div>
        </div>

        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden sidebar-nav-no-scrollbar flex flex-col min-h-0 ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}
          style={{ transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {!collapsed && (
            <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Vandaag
            </p>
          )}
          <div className="space-y-1 flex-shrink-0">{primaryNavItems.map(renderItem)}</div>

          {collapsed ? (
            <div className="space-y-1 mt-3 pt-3 border-t border-white/10 flex-shrink-0">
              {secondaryNavItems.map(renderItem)}
            </div>
          ) : (
            <div className="mt-3 pt-2 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSecondaryOpen((v) => !v)}
                aria-expanded={secondaryOpen}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                  isSecondaryRoute && !secondaryOpen
                    ? 'bg-white/10 text-slate-200 ring-1 ring-white/15'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <ChevronDownIcon
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${secondaryOpen ? 'rotate-180' : ''}`}
                />
                <span>{secondaryOpen ? 'Minder opties' : 'Meer — overzicht, agenda, …'}</span>
              </button>
              {secondaryOpen && (
                <div className="space-y-1 mt-2 pl-0.5">{secondaryNavItems.map(renderItem)}</div>
              )}
            </div>
          )}
        </nav>

        <div
          className={`relative z-20 flex-shrink-0 border-t border-white/5 ${collapsed ? 'p-3' : 'p-4 pt-3'}`}
          style={{ transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {!collapsed && (
            <p className="text-xs text-slate-500 text-center">Structuro AI v0.1.0</p>
          )}
        </div>
      </div>
    </div>
  );
}
