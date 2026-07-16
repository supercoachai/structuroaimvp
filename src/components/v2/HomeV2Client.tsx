"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";
import { loadV2Dump, v2DumpHasVisible } from "./v2Dump";
import {
  dismissV2HomePrompt,
  resolveV2HomePrompt,
  type V2HomePrompt,
} from "./v2HomePrompt";
import {
  trackV2HomePromptPriority,
  trackV2OpenTaskReminderDismissed,
  trackV2OpenTaskReminderShown,
  trackV2QuoteDismissed,
  trackV2QuoteShown,
  trackV2ReturnReminderDismissed,
  trackV2ReturnReminderShown,
  trackV2ShutdownNudgeShown,
  trackV2SkipDay1HookShown,
  trackV2WhySuggestionAccepted,
  trackV2WhySuggestionShown,
} from "./v2Analytics";
import {
  acceptV2WhySuggestion,
} from "./v2WhySuggestion";
import { v2HasThings, v2NormalizeThings } from "./v2Things";
import { markV2OpenTaskReminderShown } from "./v2OpenTaskReminder";
import { markV2QuoteShown } from "./v2Quotes";

const ENERGY_LABEL: Record<string, string> = {
  low: "Energie: laag",
  enough: "Energie: genoeg",
  high: "Energie: hoog",
};

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function trackPromptShown(prompt: V2HomePrompt): void {
  trackV2HomePromptPriority({ prompt_kind: prompt.kind });
  switch (prompt.kind) {
    case "day1_skip_hook":
      trackV2SkipDay1HookShown();
      break;
    case "shutdown_nudge":
      trackV2ShutdownNudgeShown();
      break;
    case "widget_hint":
      trackV2ReturnReminderShown({ channel: "widget_hint" });
      break;
    case "open_task_reminder":
      trackV2OpenTaskReminderShown({ channel: "home" });
      markV2OpenTaskReminderShown();
      break;
    case "why_suggestion":
      trackV2WhySuggestionShown({ source: prompt.suggestion.source });
      break;
    case "quote":
      trackV2QuoteShown({ surface: "home" });
      markV2QuoteShown();
      break;
    default:
      break;
  }
}

export default function HomeV2Client() {
  const go = useV2Go();
  const { state, ready, update } = useV2();
  const [greeting, setGreeting] = useState("");
  const [hasDump, setHasDump] = useState(false);
  const [homePrompt, setHomePrompt] = useState<V2HomePrompt | null>(null);
  const [promptTracked, setPromptTracked] = useState(false);

  const things = v2NormalizeThings(state.things);
  const hasThings = v2HasThings(things);

  useEffect(() => {
    setGreeting(greetingWord());
    const id = window.setInterval(() => setGreeting(greetingWord()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setHasDump(v2DumpHasVisible(loadV2Dump()));
    setHomePrompt(resolveV2HomePrompt(state));
    setPromptTracked(false);
  }, [ready, state]);

  useEffect(() => {
    if (!ready || !homePrompt || promptTracked) return;
    trackPromptShown(homePrompt);
    setPromptTracked(true);
  }, [ready, homePrompt, promptTracked]);

  const name = state.name.trim();
  const energyLabel = state.energy ? ENERGY_LABEL[state.energy] : null;

  const dismissPrompt = () => {
    if (!homePrompt) return;
    if (homePrompt.kind === "widget_hint") {
      trackV2ReturnReminderDismissed({ channel: "widget_hint" });
    }
    if (homePrompt.kind === "open_task_reminder") {
      trackV2OpenTaskReminderDismissed({ channel: "home" });
    }
    if (homePrompt.kind === "quote") {
      trackV2QuoteDismissed({});
    }
    dismissV2HomePrompt(homePrompt);
    setHomePrompt(null);
  };

  const acceptWhyOnHome = () => {
    if (!homePrompt || homePrompt.kind !== "why_suggestion") return;
    trackV2WhySuggestionAccepted({ source: homePrompt.suggestion.source });
    const thing = acceptV2WhySuggestion(homePrompt.suggestion);
    update({ things: [thing], todayDone: false });
    setHomePrompt(null);
  };

  const renderPrompt = () => {
    if (!ready || !homePrompt) return null;

    if (homePrompt.kind === "why_anchor") {
      return (
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
            Je deed dit voor: &ldquo;{homePrompt.why}&rdquo;
          </p>
          {homePrompt.whyOutcome.length > 0 ? (
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Het levert je op: {homePrompt.whyOutcome}
            </p>
          ) : null}
        </section>
      );
    }

    if (homePrompt.kind === "why_suggestion") {
      return (
        <section
          className="v2-fade rounded-[20px] p-4"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
          aria-live="polite"
        >
          <p className="text-[15px] leading-snug" style={{ color: "var(--text)" }}>
            {homePrompt.suggestion.invitation}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={acceptWhyOnHome}
            >
              {homePrompt.suggestion.title}
            </button>
            <button type="button" className="v2-link text-[14px]" onClick={dismissPrompt}>
              Of kies zelf
            </button>
          </div>
        </section>
      );
    }

    if (homePrompt.kind === "shutdown_nudge") {
      return (
        <section className="v2-fade v2-evening-cloud" aria-live="polite">
          <div className="v2-evening-cloud__body">
            <span className="v2-evening-cloud__moon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.4 7.4 0 1 0 18.5 14.2Z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </span>
            <p className="v2-evening-cloud__text">{homePrompt.line}</p>
            <div className="v2-evening-cloud__actions">
              <button
                type="button"
                className="v2-evening-cloud__cta"
                onClick={() => go("/v2/shutdown")}
              >
                Naar dagafsluiting
              </button>
              <button
                type="button"
                className="v2-evening-cloud__later"
                onClick={dismissPrompt}
              >
                Later
              </button>
            </div>
          </div>
          <span className="v2-evening-cloud__tail" aria-hidden />
        </section>
      );
    }

    const line =
      homePrompt.kind === "morning_reminder"
        ? homePrompt.reminder.line
        : homePrompt.line;

    const primaryAction = (() => {
      switch (homePrompt.kind) {
        case "morning_reminder":
          return (
            <Link
              href="/v2/dump"
              className="text-[14px] font-medium no-underline"
              style={{ color: "var(--accent)" }}
            >
              Naar extern geheugen
            </Link>
          );
        case "day1_skip_hook":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/dagstart")}
            >
              Naar dagstart
            </button>
          );
        case "widget_hint":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/dagstart")}
            >
              Naar dagstart
            </button>
          );
        case "open_task_reminder":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/focus")}
            >
              Naar focus
            </button>
          );
        default:
          return null;
      }
    })();

    const dismissLabel =
      homePrompt.kind === "morning_reminder"
        ? "Niet nu"
        : homePrompt.kind === "quote"
          ? "Niet vandaag"
          : "Niet vandaag";

    const promptBackground =
      homePrompt.kind === "day1_skip_hook"
        ? "var(--accent-soft)"
        : homePrompt.kind === "quote"
          ? "var(--accent-soft)"
          : "#FFFFFF";

    return (
      <section
        className="v2-fade rounded-[20px] p-4"
        style={{
          background: promptBackground,
          border: "1px solid var(--border)",
        }}
        aria-live="polite"
      >
        <p className="text-[15px] leading-snug" style={{ color: "var(--text)" }}>
          {line}
        </p>
        {primaryAction ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {primaryAction}
            <button type="button" className="v2-link text-[14px]" onClick={dismissPrompt}>
              {dismissLabel}
            </button>
          </div>
        ) : null}
      </section>
    );
  };

  const isBottomPrompt = homePrompt?.kind === "shutdown_nudge";

  return (
    <V2AppShell
      bottomSlot={
        isBottomPrompt ? (
          <div className="v2-evening-cloud-slot mx-auto w-full max-w-[480px]">
            {renderPrompt()}
          </div>
        ) : null
      }
    >
      <div
        className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-8 pt-6"
        style={{ minHeight: "100%" }}
      >
        {!isBottomPrompt ? renderPrompt() : null}

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

        {ready && hasDump ? (
          <Link
            href="/v2/dump"
            className="rounded-[14px] px-4 py-3 text-center text-[14px] no-underline"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
          >
            Naar extern geheugen
          </Link>
        ) : null}

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
        ) : hasThings ? (
          <>
            <section className="v2-card v2-fade p-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--accent)" }}
              >
                {things.length === 1 ? "Je ene ding van vandaag" : "Je dingen van vandaag"}
              </p>
              {things.length === 1 ? (
                <h2
                  className="v2-serif mt-4"
                  style={{ fontSize: "var(--fs-title)", lineHeight: "var(--lh-tight)" }}
                >
                  {things[0]}
                </h2>
              ) : (
                <ul className="mt-4 flex flex-col gap-2" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {things.map((t) => (
                    <li
                      key={t}
                      className="v2-serif"
                      style={{ fontSize: "var(--fs-title)", lineHeight: "var(--lh-tight)" }}
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
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
              <button
                type="button"
                onClick={() => go("/v2/shutdown")}
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
