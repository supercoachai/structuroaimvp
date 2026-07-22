"use client";

import { useState } from "react";

import { v2Styles } from "./theme";
import { V2_NAME_MIN_LEN } from "./v2DisplayName";

/**
 * Aanspreeknaam vóór energy/dagstart (zoals v1).
 * Persoonlijke begroeting + naam klaar voor account-aanmaak.
 */
export default function V2NameStep({
  initialName = "",
  onContinue,
}: {
  initialName?: string;
  onContinue: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const ok = name.trim().length >= V2_NAME_MIN_LEN;

  const submit = () => {
    if (!ok) return;
    onContinue(name.trim());
  };

  return (
    <>
      <h1 style={v2Styles.title}>Hoe mogen we je aanspreken?</h1>
      <p style={{ ...v2Styles.body, marginBottom: 20 }}>
        Alleen je voornaam, voor een persoonlijke begroeting.
      </p>
      <label htmlFor="v2-onboarding-name" style={v2Styles.srOnly}>
        Voornaam
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
        placeholder="Voornaam"
        autoComplete="given-name"
        autoFocus
      />
      <div style={v2Styles.actions}>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!ok}
          onClick={submit}
        >
          Verder
        </button>
      </div>
    </>
  );
}
