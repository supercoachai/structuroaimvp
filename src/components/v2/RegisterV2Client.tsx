"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { v2RouteAfterRegister } from "@/lib/v2PostRegisterRoute";

import { V2Header, V2Page } from "./V2Chrome";
import { v2Styles } from "./theme";
import { useV2 } from "./V2Context";

export default function RegisterV2Client() {
  const router = useRouter();
  const { update } = useV2();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const start = () => {
    if (name.trim().length > 0) {
      update({ name: name.trim() });
    }
    // Geen wachtwoord, geen betaalmuur vooraf: op mobiel eerst beginscherm-hint.
    router.push(v2RouteAfterRegister());
  };

  return (
    <V2Page>
      <V2Header exitHref="/v2" />

      <section className="v2-fade" style={v2Styles.card} aria-live="polite">
        <p className="v2-preview-badge">Preview · lokaal, geen echte account</p>
        <p style={v2Styles.kicker}>Welkom</p>
        <h1 style={v2Styles.title}>Begin licht. Een account mag later.</h1>
        <p style={v2Styles.body}>
          Geen wachtwoord, geen lange formulieren, geen betaling vooraf. In deze
          testomgeving blijft alles lokaal op dit apparaat.
        </p>

        <label htmlFor="v2-register-name" style={v2Styles.srOnly}>
          Hoe mogen we je noemen
        </label>
        <input
          id="v2-register-name"
          type="text"
          className="v2-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Je naam (mag, hoeft niet)"
          autoComplete="given-name"
        />

        <label htmlFor="v2-register-email" style={v2Styles.srOnly}>
          Je e-mailadres
        </label>
        <input
          id="v2-register-email"
          type="email"
          inputMode="email"
          className="v2-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@voorbeeld.nl (voor je inloglink)"
          autoComplete="email"
        />

        <div style={v2Styles.actions}>
          <button type="button" className="btn-primary w-full" onClick={start}>
            Begin rustig
          </button>
          <p style={{ ...v2Styles.body, fontSize: 13, textAlign: "center" }}>
            Je hoeft niets in te vullen om verder te gaan.
          </p>
        </div>

        <div style={{ ...v2Styles.softActions, marginTop: 4 }}>
          <Link href="/v2/login" className="v2-link">
            Heb je al een account? Log rustig in.
          </Link>
        </div>
      </section>
    </V2Page>
  );
}
