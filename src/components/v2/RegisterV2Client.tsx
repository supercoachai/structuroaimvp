"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { v2RouteAfterRegister } from "@/lib/v2PostRegisterRoute";

import { V2Page } from "./V2Chrome";
import { v2Styles } from "./theme";
import { useV2 } from "./V2Context";

export default function RegisterV2Client() {
  const router = useRouter();
  const { update } = useV2();
  const [name, setName] = useState("");

  const start = () => {
    if (name.trim().length > 0) {
      update({ name: name.trim() });
    }
    router.push(v2RouteAfterRegister());
  };

  return (
    <V2Page>
      <div className="v2-auth-gate v2-fade" aria-live="polite">
        <p className="v2-auth-gate__brand">Structuro</p>

        <div className="v2-auth-gate__body">
          <h1 className="v2-auth-gate__title">Begin licht.</h1>
          <p className="v2-auth-gate__sub">
            Een account mag later. Je kunt nu alvast beginnen.
          </p>

          <div className="v2-auth-gate__actions">
            <label htmlFor="v2-register-name" style={v2Styles.srOnly}>
              Naam
            </label>
            <input
              id="v2-register-name"
              type="text"
              className="v2-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam"
              autoComplete="given-name"
            />

            <button type="button" className="btn-primary w-full" onClick={start}>
              Begin
            </button>
          </div>
        </div>

        <p className="v2-auth-gate__footer">
          <Link href="/v2/login" className="v2-link">
            Al een account? Inloggen
          </Link>
        </p>
      </div>
    </V2Page>
  );
}
