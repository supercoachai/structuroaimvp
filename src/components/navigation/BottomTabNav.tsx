"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { id: "home", href: "/", label: "Start", Icon: IconSun },
  { id: "taken", href: "/todo", label: "Taken", Icon: IconTasks },
  { id: "focus", href: "/focus", label: "Focus", Icon: IconTarget },
  { id: "shutdown", href: "/shutdown", label: "Afsluiten", Icon: IconShutdown },
] as const;

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconTasks({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconShutdown({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomTabNav({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className={`structuro-bottom-nav flex shrink-0 border-t bg-white px-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
      style={{ borderColor: "var(--structuro-border)" }}
      aria-label="Hoofdnavigatie"
      aria-disabled={disabled}
    >
      {tabs.map((t) => {
        const active = isActivePath(pathname, t.href);
        const color = active ? "var(--structuro-blue)" : "var(--structuro-sub)";
        return (
          <Link
            key={t.id}
            href={t.href}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors"
            style={{ color }}
          >
            <t.Icon className="shrink-0" />
            <span className="max-w-full truncate text-[10px] font-semibold tracking-wide">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
