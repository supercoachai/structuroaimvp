'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  BellIcon,
  FireIcon,
  TrophyIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  collapsed?: boolean;
}

const mainMenuItems = [
  { name: 'Overzicht', href: '/', icon: HomeIcon, description: 'Dagelijkse planning', accent: '#3b82f6' },
  { name: 'Dagstart', href: '/dagstart', icon: '🌅', description: 'Begin je dag', isSpecial: true, accent: '#f59e0b' },
  { name: 'Taken & Prioriteiten', href: '/todo', icon: ClipboardDocumentCheckIcon, description: 'Slimme takenlijst', accent: '#22c55e' },
  { name: 'Agenda & Planning', href: '/agenda', icon: CalendarIcon, description: 'Dagplanner', accent: '#6366f1' },
  { name: 'Herinneringen', href: '/notificaties', icon: BellIcon, description: 'Slimme alerts', accent: '#8b5cf6' },
  { name: 'Focus Modus', href: '/focus', icon: FireIcon, description: 'Concentratie hulp', accent: '#ea580c' },
  { name: 'Beloningen', href: '/gamification', icon: TrophyIcon, description: 'Motivatie & beloningen', accent: '#d97706' },
  { name: 'Instellingen', href: '/settings', icon: Cog6ToothIcon, description: 'Persoonlijk', accent: '#6366f1' },
];

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Geen actieve sessie, bijvoorbeeld bij lokale modus
    }
    // Verwijder lokale modus cookie (als die er was)
    document.cookie = 'structuro_local_mode=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div
      className={`relative z-10 flex-shrink-0 h-full shadow-sm bg-slate-900 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width'
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header – ruimte om te ademen */}
        <div
          className={`flex-shrink-0 ${collapsed ? 'p-4' : 'p-6 pb-8'}`}
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
                whiteSpace: 'nowrap'
              }}
            >
              <h1 className="text-lg font-semibold text-white">Structuro</h1>
              <p className="text-xs text-slate-400 mt-0.5">Jouw houvast in chaos</p>
            </div>
          </div>
        </div>

        {/* Main Navigation – scrollbaar zonder zichtbare scrollbalk (responsief) */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden sidebar-nav-no-scrollbar ${collapsed ? 'px-2 py-2' : 'px-3 py-4'}`}
          style={{ transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="space-y-1">
            {mainMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const accent = (item as any).accent || '#64748b';
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center rounded-xl group transition-all duration-200 ${
                    collapsed ? 'justify-center px-2 py-4' : 'pl-4 pr-3 py-4 space-x-3'
                  } ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  title={collapsed ? item.description : undefined}
                >
                  {/* Verticale indicator – actief item */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full flex-shrink-0"
                      style={{ background: accent }}
                    />
                  )}

                  {/* Icoon in cirkel – actief: oplichten in categoriekleur; inactief: leesbaar contrast */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 ${
                      collapsed ? 'w-10 h-10' : 'w-10 h-10 p-2'
                    }`}
                    style={{
                      background: isActive ? `${accent}40` : 'rgba(255,255,255,0.06)'
                    }}
                  >
                    {typeof item.icon === 'string' ? (
                      <span className={collapsed ? 'text-xl' : 'text-lg'}>{item.icon}</span>
                    ) : (
                      <item.icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${isActive ? '' : 'text-slate-400 group-hover:text-slate-200'}`}
                        style={isActive ? { color: accent } : undefined}
                      />
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
                      marginLeft: collapsed ? 0 : 12
                    }}
                  >
                    <span
                      className={`block font-medium text-sm transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-gray-200'
                      }`}
                    >
                      {item.name}
                    </span>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 truncate transition-colors duration-200">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer – ruimte */}
        <div
          className={`relative z-20 flex-shrink-0 border-t border-white/5 ${collapsed ? 'p-3' : 'p-4 pt-6'}`}
          style={{ transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl text-sm font-medium text-slate-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-2 py-4' : 'px-4 py-4 space-x-3'
            }`}
            title={collapsed ? 'Uitloggen' : undefined}
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/5">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </div>
            <span
              style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                overflow: 'hidden',
                transition: 'opacity 0.2s, width 0.3s',
                whiteSpace: 'nowrap',
                marginLeft: collapsed ? 0 : 12
              }}
            >
              Uitloggen
            </span>
          </button>
          {!collapsed && (
            <p className="text-xs text-slate-500 text-center mt-4">Structuro AI v0.1.0</p>
          )}
        </div>
      </div>
    </div>
  );
}
