"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { V2Header, V2Page } from "./V2Chrome";
import { v2Styles } from "./theme";

export default function LoginV2Client() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const sendLink = () => {
    // Geen echte auth: dit is een visuele magic-link-stand-in.
    setLinkSent(true);
  };

  return (
    <V2Page>
      <V2Header exitHref="/v2" />

      <section className="v2-fade" style={v2Styles.card} aria-live="polite">
        <p className="v2-preview-badge">Preview · geen echte login</p>
        <p style={v2Styles.kicker}>Welkom terug</p>
        <h1 style={v2Styles.title}>Inloggen bij Structuro</h1>

        {!linkSent ? (
          <>
            <p style={v2Styles.body}>
              Geen wachtwoord nodig. Vul je e-mail in, dan sturen we je een link om
              direct binnen te komen. In deze testomgeving is dat alleen een
              voorbeeldflow.
            </p>
            <label htmlFor="v2-login-email" style={v2Styles.srOnly}>
              Je e-mailadres
            </label>
            <input
              id="v2-login-email"
              type="email"
              inputMode="email"
              className="v2-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@voorbeeld.nl"
              autoComplete="email"
            />
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={sendLink}>
                Stuur me een inloglink
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ ...v2Styles.title, fontSize: 18 }}>Check je mail.</h2>
            <p style={v2Styles.body}>
              We hebben een link gestuurd{email.trim() ? ` naar ${email.trim()}` : ""}.
              Tik erop om binnen te komen. In deze testomgeving werkt het zo.
            </p>
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => router.push("/v2/home")}
              >
                Doorgaan als testgebruiker
              </button>
              <button type="button" className="v2-link" onClick={() => setLinkSent(false)}>
                Ander e-mailadres
              </button>
            </div>
          </>
        )}

        <div style={{ ...v2Styles.softActions, marginTop: 8 }}>
          <Link href="/v2/register" className="v2-link">
            Nog geen account? Maak er rustig een aan.
          </Link>
        </div>
      </section>
    </V2Page>
  );
}
