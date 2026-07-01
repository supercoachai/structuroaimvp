"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";

const ENERGY_LABEL: Record<string, string> = {
  low: "Energie: laag",
  enough: "Energie: genoeg",
  high: "Energie: veel",
};

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function HomeV2Client() {
  const go = useV2Go();
  const { state, ready, update } = useV2();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(greetingWord());
    const id = window.setInterval(() => setGreeting(greetingWord()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const name = state.name.trim();
  const hasThing = Boolean(state.thing && state.thing.trim().length > 0);
  const showWhyAnchor = state.energy === "low" && state.why.trim().length > 0;
  const energyLabel = state.energy ? ENERGY_LABEL[state.energy] : null;

  return (
    <V2AppShell>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-8 pt-6">
        {showWhyAnchor ? (
          <section
            className="v2-fade rounded-[20px] p-4"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            aria-live="polite"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              Even een zacht zetje
            </p>
            <p className="mt-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
              Je deed dit voor: &ldquo;{state.why.trim()}&rdquo;
            </p>
            {state.whyOutcome.trim().length > 0 ? (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Het levert je op: {state.whyOutcome.trim()}
              </p>
            ) : null}
          </section>
        ) : null}

        <header>
          <V2Eyebrow>{greeting || "Welkom"}</V2Eyebrow>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1
              className="v2-serif min-w-0 flex-1"
              style={{ fontSize: "var(--fs-display)" }}
            >
              {name || "Welkom"}
            </h1>
            {energyLabel ? (
              <span
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--border)",
                }}
              >
                {energyLabel}
              </span>
            ) : null}
          </div>
        </header>

        {!ready ? (
          <div
            className="rounded-[20px] p-6 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
            aria-busy="true"
          >
            Even laden.
          </div>
        ) : state.todayDone ? (
          <section
            className="v2-card v2-fade p-6 text-center"
            aria-live="polite"
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
              aria-hidden
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-9" stroke="var(--text-on-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
              Vandaag is rond.
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Je sloot de lus. Rust met een gerust hart. Morgen begin je opnieuw.
            </p>
            <button
              type="button"
              onClick={() => update({ todayDone: false })}
              className="v2-link mx-auto mt-3 block"
            >
              Toch nog iets doen
            </button>
          </section>
        ) : hasThing ? (
          <>
            <section className="v2-card v2-fade p-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--accent)" }}
              >
                Je ene ding van vandaag
              </p>
              <h2
                className="v2-serif mt-2"
                style={{ fontSize: "var(--fs-title)", lineHeight: "var(--lh-tight)" }}
              >
                {state.thing}
              </h2>
              <button
                type="button"
                onClick={() => go("/v2/focus")}
                className="btn-primary mt-5 w-full"
              >
                Start focus
              </button>
            </section>

            <div className="flex flex-col items-center gap-1">
              <Link href="/v2/dagstart" className="btn-ghost w-full">
                Open je dagstart
              </Link>
              {/* H1 Shutdown-light: tik klaar voor vandaag, ook via nav-tab Dagafsluiting. */}
              <button
                type="button"
                onClick={() => update({ todayDone: true })}
                className="v2-link"
              >
                Klaar voor vandaag
              </button>
            </div>
          </>
        ) : (
          <section className="v2-card v2-fade p-6 text-center">
            <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
              Nog niks gekozen, en dat is prima.
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Begin je dag rustig en kies een ding.
            </p>
            <button
              type="button"
              onClick={() => go("/v2/dagstart")}
              className="btn-primary mx-auto mt-5"
            >
              Doe je dagstart
            </button>
          </section>
        )}
      </div>
    </V2AppShell>
  );
}
