"use client";

import type { CSSProperties, ReactNode } from "react";

import { v2Styles } from "./theme";

export function V2SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={v2Styles.settingsSection}>
      <h2 style={v2Styles.settingsSectionTitle}>{title}</h2>
      <div style={v2Styles.settingsCard}>{children}</div>
    </section>
  );
}

export function V2SettingsRow({
  label,
  hint,
  children,
  stack,
  last = false,
  onLabelClick,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  stack?: boolean;
  last?: boolean;
  onLabelClick?: () => void;
}) {
  if (stack) {
    return (
      <div
        style={{
          ...v2Styles.settingsRow,
          flexDirection: "column",
          alignItems: "stretch",
          ...(last ? v2Styles.settingsRowLast : {}),
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={v2Styles.settingsLabel}>{label}</p>
          {hint ? <p style={v2Styles.settingsHint}>{hint}</p> : null}
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    );
  }

  const labelBlock = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <p style={v2Styles.settingsLabel}>{label}</p>
      {hint ? <p style={v2Styles.settingsHint}>{hint}</p> : null}
    </div>
  );

  return (
    <div
      style={{
        ...v2Styles.settingsRow,
        ...(last ? v2Styles.settingsRowLast : {}),
      }}
    >
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          style={v2SettingsLabelButtonStyle}
        >
          {labelBlock}
        </button>
      ) : (
        labelBlock
      )}
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const v2SettingsLabelButtonStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  touchAction: "manipulation",
};

export function V2SettingsToggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      style={{
        ...v2Styles.settingsToggle,
        ...(checked ? v2Styles.settingsToggleOn : {}),
        ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        touchAction: "manipulation",
      }}
    >
      <span
        aria-hidden
        style={{
          ...v2Styles.settingsToggleKnob,
          ...(checked ? v2Styles.settingsToggleKnobOn : {}),
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

export function V2SettingsTextLink({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="v2-textlink"
      style={{
        ...v2Styles.textlink,
        display: "block",
        textAlign: "left",
        fontSize: 14,
        fontWeight: 500,
        color: variant === "danger" ? "#B91C1C" : "var(--text-muted)",
        padding: "4px 0",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

export function V2SettingsLinkActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      {children}
    </div>
  );
}

export function V2LocaleButtons({
  locale,
  onChange,
  labels,
}: {
  locale: "nl" | "en";
  onChange: (next: "nl" | "en") => void;
  labels: { nl: string; en: string };
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["nl", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            style={{
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              border: active ? "none" : "1px solid var(--border)",
              backgroundColor: active ? "var(--accent)" : "#FFFFFF",
              color: active ? "#FFFFFF" : "var(--text)",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            {labels[code]}
          </button>
        );
      })}
    </div>
  );
}
