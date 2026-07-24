"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import { v2Styles } from "./theme";
import { V2_NAME_MIN_LEN } from "./v2DisplayName";

/**
 * Aanspreeknaam ná account-aanmaak (niet vóór).
 * Eén veld, één CTA, overslaan mag. Prefill uit Google/metadata.
 */
export default function V2NameStep({
  initialName = "",
  busy = false,
  error = null,
  onContinue,
  onSkip,
}: {
  initialName?: string;
  busy?: boolean;
  error?: string | null;
  onContinue: (name: string) => void | Promise<void>;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const ok = name.trim().length >= V2_NAME_MIN_LEN;

  const submit = () => {
    if (!ok || busy) return;
    void onContinue(name.trim());
  };

  return (
    <>
      <h1 style={v2Styles.title}>{t("v2.nameTitle")}</h1>
      <p style={{ ...v2Styles.body, marginBottom: 20 }}>{t("v2.nameSub")}</p>
      <label htmlFor="v2-onboarding-name" style={v2Styles.srOnly}>
        {t("v2.nameLabel")}
      </label>
      <input
        id="v2-onboarding-name"
        type="text"
        className="v2-field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={t("v2.namePlaceholder")}
        autoComplete="given-name"
        autoFocus
        disabled={busy}
      />
      {error ? (
        <p className="v2-auth-gate__error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      <div style={v2Styles.actions}>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!ok || busy}
          onClick={submit}
        >
          {busy ? t("v2.nameBusy") : t("v2.nameContinue")}
        </button>
        <button
          type="button"
          className="v2-link"
          onClick={onSkip}
          disabled={busy}
        >
          {t("v2.nameSkip")}
        </button>
      </div>
    </>
  );
}
