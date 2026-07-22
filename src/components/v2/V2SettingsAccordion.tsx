"use client";

import type { ReactNode } from "react";

type V2SettingsAccordionProps = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/** Progressive silence: één accordion-kaart, standaard dicht. */
export default function V2SettingsAccordion({
  id,
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
}: V2SettingsAccordionProps) {
  const panelId = `v2-settings-panel-${id}`;
  const headerId = `v2-settings-header-${id}`;

  return (
    <section className={`v2-settings-acc${open ? " is-open" : ""}`}>
      <h2 className="v2-settings-acc__heading">
        <button
          type="button"
          id={headerId}
          className="v2-settings-acc__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="v2-settings-acc__icon" aria-hidden>
            {icon}
          </span>
          <span className="v2-settings-acc__copy">
            <span className="v2-settings-acc__title">{title}</span>
            <span className="v2-settings-acc__sub">{subtitle}</span>
          </span>
          <span className="v2-settings-acc__chev" aria-hidden>
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 10l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>
      </h2>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="v2-settings-acc__panel"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function V2SettingsIconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c1.6-3.2 4-4.75 6.5-4.75s4.9 1.55 6.5 4.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function V2SettingsIconCycle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 0 1 12.4-5.7M19.5 12a7.5 7.5 0 0 1-12.4 5.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 4.5v3.2h3.2M8 19.5v-3.2H4.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function V2SettingsIconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.5 1.5 5.5H5s1.5-1.3 1.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function V2SettingsIconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5.5"
        y="10.5"
        width="13"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function V2SettingsIconAccount() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4.5 5.5v4.2H8.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function V2SettingsIconWarn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 3.8 19h16.4L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  );
}
