'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  ClipboardDocumentCheckIcon, 
  CalendarIcon,
  BellIcon,
  FireIcon,
  TrophyIcon,
  EllipsisHorizontalIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  collapsed?: boolean;
}

const mainMenuItems = [
  { name: 'Overzicht', href: '/', icon: HomeIcon, description: 'Dagelijkse planning' },
  { name: 'Dagstart', href: '/dagstart', icon: '🌅', description: 'Begin je dag', isSpecial: true },
  { name: 'Taken & Prioriteiten', href: '/todo', icon: ClipboardDocumentCheckIcon, description: 'Slimme takenlijst' },
  { name: 'Agenda & Planning', href: '/agenda', icon: CalendarIcon, description: 'Dagplanner' },
  { name: 'Herinneringen', href: '/notificaties', icon: BellIcon, description: 'Slimme alerts' },
  { name: 'Focus Modus', href: '/focus', icon: FireIcon, description: 'Concentratie hulp' },
  { name: 'Beloningen', href: '/gamification', icon: TrophyIcon, description: 'Motivatie & beloningen' },
];

const moreMenuItems = [
  { name: 'Check-in', href: '/checkin', icon: '⏰', description: 'Dagelijkse balans' },
  { name: 'Reflectie', href: '/reflection', icon: '📖', description: 'Weekoverzicht' },
  { name: 'Slaap & Rust', href: '/sleep', icon: '❤️', description: 'Welzijn' },
  { name: 'Inzichten', href: '/inzichten', icon: '📊', description: 'Voortgang' },
  { name: 'Instellingen', href: '/settings', icon: '⚙️', description: 'Persoonlijk' },
];

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 transition-all duration-300 flex-shrink-0 h-full fixed left-0 top-0 z-40 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img 
                src="/Logo Structuro.png" 
                alt="Structuro Logo" 
                className={`${collapsed ? 'w-8 h-8' : 'w-10 h-10'} object-contain`}
              />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Structuro</h1>
                <p className="text-xs text-slate-500 dark:text-gray-400">Jouw houvast in chaos</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation - Alleen de 3 hoofdfuncties */}
        <nav className="flex-1 p-4 space-y-2">
          {mainMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const isSpecial = (item as any).isSpecial;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                    : isSpecial
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-700 hover:from-orange-100 hover:to-amber-100'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={collapsed ? item.description : undefined}
              >
                {typeof item.icon === 'string' ? (
                  <span className="text-xl">{item.icon}</span>
                ) : (
                  <item.icon className={`w-5 h-5 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`} />
                )}
                {!collapsed && (
                  <div className="flex-1">
                    <span>{item.name}</span>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}

          {/* Meer-menu knop */}
          {!collapsed && (
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
              <span>Meer opties</span>
            </button>
          )}

          {/* Meer-menu items (verborgen standaard) */}
          {showMoreMenu && !collapsed && (
            <div className="mt-2 space-y-1">
              {moreMenuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <span className="text-xs">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200 ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Uitloggen' : undefined}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            {!collapsed && <span>Uitloggen</span>}
          </button>
          {!collapsed && (
            <div className="text-xs text-slate-500 dark:text-gray-400 text-center mt-2">
              <p>Structuro AI v0.1.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
