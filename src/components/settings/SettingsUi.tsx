'use client';

import type { ReactNode } from 'react';

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
  stack,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  stack?: boolean;
}) {
  if (stack) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>
        ) : null}
        <div className="mt-3">{children}</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          {hint ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>
          ) : null}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
  busy,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled || busy}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsTextLink({
  children,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  type?: 'button' | 'submit';
}) {
  const color =
    variant === 'danger'
      ? 'text-red-600 hover:text-red-700'
      : 'text-slate-600 hover:text-slate-900';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`block text-left text-sm font-medium underline-offset-2 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {children}
    </button>
  );
}

export function SettingsLinkActions({ children }: { children: ReactNode }) {
  return <div className="space-y-2.5 px-4 py-3">{children}</div>;
}
