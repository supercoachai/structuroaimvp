"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    // Geen wachtwoord, geen betaalmuur vooraf: direct de rustige reis in.
    router.push("/v2/onboarding");
  };

  return (
    <V2Page>
      <V2Header exitHref="/v2" />

      <section className="v2-fade" style={v2Styles.card} aria-live="polite">
        <p style={v2Styles.kicker}>Welkom</p>
        <h1 style={v2Styles.title}>Begin licht. Een account mag later.</h1>
        <p style={v2Styles.body}>
          Geen wachtwoord, geen lange formulieren, geen betaling vooraf. We sturen je
          later gewoon een inloglink. Je kunt zo beginnen.
        </p>

        <label htmlFor="v2-register-name" style={v2Styles.srOnly}>
          Hoe mogen we je noemen
        </label>
        <input
          id="v2-register-name"
          type="text"
          className="v2-input"
          style={v2Styles.input}
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
          className="v2-input"
          style={v2Styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jij@voorbeeld.nl (voor je inloglink)"
          autoComplete="email"
        />

        <div style={v2Styles.actions}>
          <button
            type="button"
            className="v2-cta"
            style={v2Styles.cta}
            onClick={start}
          >
            Begin rustig
          </button>
          <p style={{ ...v2Styles.body, fontSize: 13, textAlign: "center" }}>
            Je hoeft niets in te vullen om verder te gaan.
          </p>
        </div>

        <div style={{ ...v2Styles.softActions, marginTop: 4 }}>
          <Link href="/v2/login" className="v2-textlink" style={v2Styles.textlink}>
            Heb je al een account? Log rustig in.
          </Link>
        </div>
      </section>
    </V2Page>
  );
}
