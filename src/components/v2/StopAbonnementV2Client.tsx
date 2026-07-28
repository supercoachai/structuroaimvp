"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { V2Eyebrow, V2Header, V2Page } from "@/components/v2/V2Chrome";
import { v2Styles } from "@/components/v2/theme";

type Status = "idle" | "loading" | "done" | "error";

export default function StopAbonnementV2Client() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [status, setStatus] = useState<Status>(token ? "idle" : "error");
  const [error, setError] = useState(
    token ? "" : "Deze link is ongeldig of verlopen."
  );

  const onConfirm = useCallback(async () => {
    if (!token) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/subscription/one-click-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(
          data.error === "invalid_token"
            ? "Deze link is ongeldig of verlopen."
            : data.error || "Opzeggen lukte niet. Probeer het later opnieuw."
        );
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Opzeggen lukte niet. Probeer het later opnieuw.");
    }
  }, [token]);

  return (
    <V2Page>
      <V2Header />
      <main style={{ padding: "28px 20px 48px", maxWidth: 480, margin: "0 auto" }}>
        <V2Eyebrow>Abonnement</V2Eyebrow>
        {status === "done" ? (
          <>
            <h1 style={{ ...v2Styles.h1, marginTop: 12 }}>Gestopt.</h1>
            <p style={{ ...v2Styles.body, marginTop: 12 }}>
              Je abonnement stopt aan het einde van je huidige periode. Je krijgt
              geen verdere afschrijvingen.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ ...v2Styles.h1, marginTop: 12 }}>
              Stop mijn abonnement
            </h1>
            <p style={{ ...v2Styles.body, marginTop: 12 }}>
              Eén knop. Geen gesprek, geen reden opgeven. Je proefperiode blijft
              bruikbaar tot het einde.
            </p>
            {error ? (
              <p style={{ ...v2Styles.body, marginTop: 16, color: "#8B3A3A" }}>
                {error}
              </p>
            ) : null}
            {token ? (
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={status === "loading"}
                style={{
                  ...v2Styles.primaryButton,
                  marginTop: 28,
                  width: "100%",
                  opacity: status === "loading" ? 0.7 : 1,
                }}
              >
                {status === "loading"
                  ? "Bezig…"
                  : "Ja, stop mijn abonnement"}
              </button>
            ) : null}
          </>
        )}
      </main>
    </V2Page>
  );
}
