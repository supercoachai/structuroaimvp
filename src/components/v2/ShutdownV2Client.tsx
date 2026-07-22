"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { V2AppShell, V2Eyebrow, V2Progress } from "./V2Chrome";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import {
  addV2DumpItem,
  isV2EveningLocal,
  loadV2Dump,
  saveV2Dump,
  v2DumpAtMax,
} from "./v2Dump";
import { loadV2Tasks, type V2Task } from "./v2Tasks";
import {
  trackV2EveningDumpAdded,
  trackV2ShutdownCompleted,
  trackV2ShutdownSentiment,
} from "./v2Analytics";
import { markV2FirstValue } from "./v2CycleOptInPrompt";
import { markReturnPermissionPending, shouldOfferReturnPermission } from "./v2ReturnPermission";

type Phase = "review" | "sentiment" | "dump";
const TOTAL = 2;

type Win = { id: string; label: string; kind: "task" | "micro" };

function collectWins(tasks: V2Task[]): Win[] {
  const wins: Win[] = [];
  for (const task of tasks) {
    if (task.done && task.title.trim().length > 0) {
      wins.push({ id: task.id, label: task.title, kind: "task" });
    }
    for (const step of task.microSteps) {
      if (step.done && step.title.trim().length > 0) {
        wins.push({ id: `${task.id}-${step.id}`, label: step.title, kind: "micro" });
      }
    }
  }
  return wins;
}

export default function ShutdownV2Client() {
  const go = useV2Go();
  const [phase, setPhase] = useState<Phase>("review");
  const [eveningDraft, setEveningDraft] = useState("");
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setTasks(loadV2Tasks());
  }, []);

  useEffect(() => {
    scrollV2ToTop();
  }, [phase]);

  const wins = useMemo(() => collectWins(tasks), [tasks]);
  const singleWin = wins.length === 1;

  const finishShutdown = useCallback(() => {
    const trimmed = eveningDraft.trim();
    let dumpAdded = false;
    if (trimmed.length > 0) {
      const items = loadV2Dump();
      if (!v2DumpAtMax(items)) {
        saveV2Dump(addV2DumpItem(trimmed, items));
        dumpAdded = true;
        if (isV2EveningLocal()) {
          trackV2EveningDumpAdded({ source: "shutdown", contentLength: trimmed.length });
        }
      }
    }
    trackV2ShutdownCompleted({ winCount: wins.length, dumpAdded });
    markV2FirstValue();
    if (wins.length >= 1 && shouldOfferReturnPermission()) {
      markReturnPermissionPending();
    }
    go("/v2/home", { todayDone: true });
  }, [eveningDraft, go, wins.length]);

  const goToDump = () => setPhase("dump");

  const goToSentimentOrDump = () => {
    setPhase("sentiment");
  };

  const skipSentiment = () => {
    trackV2ShutdownSentiment({ sentiment: "skipped" });
    goToDump();
  };

  const confirmCalm = () => {
    trackV2ShutdownSentiment({ sentiment: "calm_yes" });
    goToDump();
  };

  const confirmNotCalm = () => {
    trackV2ShutdownSentiment({ sentiment: "calm_no" });
    goToDump();
  };

  const stepNumber = phase === "review" ? 1 : 2;

  return (
    <V2AppShell>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-10 pt-6">
        <header>
          <div className="v2-info-head">
            <V2Eyebrow>Dagafsluiting</V2Eyebrow>
            <V2InfoHint
              infoId="v2_shutdown"
              expanded={infoOpen}
              onToggle={() => setInfoOpen((v) => !v)}
              expandLabel={V2_INFO_SHEETS.shutdown.openAria}
              collapseLabel={V2_INFO_SHEETS.shutdown.closeAria}
              controlsId="v2-shutdown-info-sheet"
            />
          </div>
          <h1 className="v2-serif mt-2" style={{ fontSize: "var(--fs-display)" }}>
            {phase === "review"
              ? "Wat is af vandaag"
              : phase === "sentiment"
                ? "Even checken"
                : "Nog iets loslaten?"}
          </h1>
        </header>

        <V2Progress step={stepNumber} total={TOTAL} />

        {phase === "review" ? (
          <>
            <section
              className="rounded-[16px] p-4 v2-fade"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
            >
              {wins.length === 0 ? (
                <>
                  <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
                    Geen afgevinkte stappen vandaag, en dat mag. Een rustige dag telt ook.
                  </p>
                  <p className="mt-3 text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Dit mag morgen. Niets is mislukt.
                  </p>
                </>
              ) : singleWin ? (
                <div className="py-4 text-center">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: "var(--accent)" }}
                  >
                    Eén ding af
                  </p>
                  <p
                    className="v2-serif mt-3"
                    style={{ fontSize: 28, lineHeight: 1.3, color: "var(--text)" }}
                  >
                    {wins[0].label}
                  </p>
                  <p className="mt-4 text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Dat telt. Meer hoeft niet.
                  </p>
                </div>
              ) : (
                <>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: "var(--accent)" }}
                  >
                    Wat je vandaag deed
                  </p>
                  <ul
                    className="mt-2 flex flex-col gap-2"
                    style={{ margin: 0, padding: 0, listStyle: "none" }}
                  >
                    {wins.map((w) => (
                      <li key={w.id} className="text-[15px] leading-snug">
                        {w.label}
                        {w.kind === "micro" ? (
                          <span className="ml-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
                            (kleine stap)
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Dat telt. Meer hoeft niet.
                  </p>
                </>
              )}
            </section>

            <button type="button" onClick={goToSentimentOrDump} className="btn-primary w-full">
              Verder
            </button>
            <button type="button" onClick={finishShutdown} className="v2-link mx-auto">
              Overslaan, dag is rond
            </button>
          </>
        ) : phase === "sentiment" ? (
          <>
            <section
              className="rounded-[16px] p-4 v2-fade"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
            >
              <p className="text-[15px]" style={{ color: "var(--text)" }}>
                Voelde dit rustig?
              </p>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
                Optioneel. Geen goed of fout antwoord.
              </p>
            </section>
            <button type="button" onClick={confirmCalm} className="btn-primary w-full">
              Ja, rustig
            </button>
            <button type="button" onClick={confirmNotCalm} className="v2-link mx-auto">
              Niet echt
            </button>
            <button type="button" onClick={skipSentiment} className="v2-link mx-auto">
              Overslaan
            </button>
          </>
        ) : (
          <>
            <section
              className="rounded-[16px] p-4"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
            >
              <label htmlFor="v2-shutdown-dump" className="text-[15px]">
                Nog iets uit je hoofd?
              </label>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
                Optioneel. Het komt op je dumplijst, voor morgen of later.
              </p>
              <input
                id="v2-shutdown-dump"
                type="text"
                value={eveningDraft}
                onChange={(e) => setEveningDraft(e.target.value)}
                placeholder="Typ wat er nog rondspookt..."
                className="v2-field mt-3"
                autoComplete="off"
              />
            </section>

            <button type="button" onClick={finishShutdown} className="btn-primary w-full">
              {eveningDraft.trim().length > 0 ? "Opslaan en afronden" : "Dag is rond"}
            </button>
            <button
              type="button"
              onClick={() => {
                trackV2ShutdownCompleted({ winCount: wins.length, dumpAdded: false });
                markV2FirstValue();
                if (wins.length >= 1 && shouldOfferReturnPermission()) {
                  markReturnPermissionPending();
                }
                go("/v2/home", { todayDone: true });
              }}
              className="v2-link mx-auto"
            >
              Naar home zonder dump
            </button>
          </>
        )}
      </div>

      <V2InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        eyebrow={V2_INFO_SHEETS.shutdown.eyebrow}
        title={V2_INFO_SHEETS.shutdown.title}
        rows={V2_INFO_SHEETS.shutdown.rows}
        gotItLabel={V2_INFO_SHEETS.shutdown.gotIt}
        closeAria={V2_INFO_SHEETS.shutdown.closeAria}
        panelId="v2-shutdown-info-sheet"
      />
    </V2AppShell>
  );
}
