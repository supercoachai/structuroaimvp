"use client";

import Link from 'next/link';

type StructuroTopBarProps = {
  showSettings?: boolean;
  showLogout?: boolean;
  dark?: boolean;
  onLogout?: () => void;
  settingsLabel?: string;
  logoutLabel?: string;
};

function IconBtn({
  children,
  dark,
  ariaLabel,
  onClick,
  href,
}: {
  children: React.ReactNode;
  dark?: boolean;
  ariaLabel: string;
  onClick?: () => void;
  href?: string;
}) {
  const baseStyle: React.CSSProperties = {
    all: 'unset',
    cursor: 'pointer',
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: dark ? 'var(--st-night-muted)' : 'var(--st-muted)',
    transition: 'background 140ms, color 140ms',
  };

  const className = 'hover:bg-black/[0.04]';

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} style={baseStyle} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} style={baseStyle} className={className}>
      {children}
    </button>
  );
}

export default function StructuroTopBar({
  showSettings = true,
  showLogout = true,
  dark = false,
  onLogout,
  settingsLabel = 'Instellingen',
  logoutLabel = 'Uitloggen',
}: StructuroTopBarProps) {
  return (
    <header
      className="flex shrink-0 items-center justify-between px-[22px]"
      style={{
        height: 56,
        borderBottom: dark ? '1px solid var(--st-night-line)' : '1px solid var(--st-line)',
        paddingTop: 'max(0px, env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center gap-2.5">
        <img
          src="/logo-structuro.png"
          alt="Structuro"
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 rounded-md object-contain"
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: dark ? 'var(--st-night-ink)' : 'var(--st-ink)',
          }}
        >
          Structuro
        </span>
      </div>
      <div className="flex items-center gap-1">
        {showSettings ? (
          <IconBtn dark={dark} ariaLabel={settingsLabel} href="/settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </IconBtn>
        ) : null}
        {showLogout ? (
          <IconBtn dark={dark} ariaLabel={logoutLabel} onClick={onLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconBtn>
        ) : null}
      </div>
    </header>
  );
}
