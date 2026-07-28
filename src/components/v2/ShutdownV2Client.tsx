"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { V2AppShell, V2Eyebrow, V2Progress } from "./V2Chrome";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import V2TaskBattery from "./V2TaskBattery";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import {
  addV2DumpItem,
  isV2EveningLocal,
  loadV2Dump,
  saveV2Dump,
  v2DumpAtMax,
} from "./v2Dump";
import { v2TaskEnergyToDay } from "./v2EnergyMeta";
import { loadV2Tasks, type V2Task } from "./v2Tasks";
import {
  trackV2EveningDumpAdded,
  trackV2ShutdownCompleted,
  trackV2ShutdownSentiment,
} from "./v2Analytics";
import { markV2FirstValue } from "./v2CycleOptInPrompt";
import { markReturnPermissionPending, shouldOfferReturnPermission } from "./v2ReturnPermission";
import { collectWins, type V2ShutdownWin } from "./v2ShutdownWins";

type Phase = "review" | "sentiment" | "dump";
const TOTAL = 2;

function WinCheck({ size = 19 }: { size?: number }) {
  return (
    <span className="v2-propose-task__chk" style={{ width: size, height: size }} aria-hidden>
      ✓
    </span>
  );
}

function WinRow({ win }: { win: V2ShutdownWin }) {
  return (
    <li className="v2-shutdown-win">
      <WinCheck />
      <span className="v2-shutdown-win__label">{win.label}</span>
      <V2TaskBattery energy={v2TaskEnergyToDay(win.energy)} size={16} />
    </li>
  );
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

  const title =
    phase === "review"
      ? "Wat is af vandaag"
      : phase === "sentiment"
        ? "Checken"
        : "Nog iets loslaten?";

  return (
    <V2AppShell scroll={false}>
      <div className="v2-shutdown">
        <header className="v2-shutdown__top">
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
          <h1 className="v2-serif v2-shutdown__title">{title}</h1>
          {phase === "sentiment" ? (
            <p className="v2-shutdown__lead">
              Kort merken hoe de dag voelde. Optioneel, geen score.
            </p>
          ) : null}
          <div className="v2-shutdown__progress">
            <V2Progress step={stepNumber} total={TOTAL} />
          </div>
        </header>

        <div className="v2-shutdown__stage">
          {phase === "review" ? (
            <section className="v2-shutdown__card v2-fade" aria-live="polite">
              {wins.length === 0 ? (
                <>
                  <p className="v2-shutdown__body">
                    Geen afgevinkte taken vandaag, en dat mag. Een rustige dag telt ook.
                  </p>
                  <p className="v2-shutdown__muted">Dit mag morgen. Niets is mislukt.</p>
                </>
              ) : singleWin ? (
                <div className="v2-shutdown__single">
                  <p className="v2-shutdown__kicker">Eén ding af</p>
                  <div className="v2-shutdown-win v2-shutdown-win--hero">
                    <WinCheck size={22} />
                    <span className="v2-shutdown-win__label v2-shutdown-win__label--hero">
                      {wins[0].label}
                    </span>
                    <V2TaskBattery energy={v2TaskEnergyToDay(wins[0].energy)} size={18} />
                  </div>
                  <p className="v2-shutdown__muted">Dat telt. Meer hoeft niet.</p>
                </div>
              ) : (
                <>
                  <p className="v2-shutdown__kicker">Wat je vandaag deed</p>
                  <ul className="v2-shutdown-wins">
                    {wins.map((w) => (
                      <WinRow key={w.id} win={w} />
                    ))}
                  </ul>
                  <p className="v2-shutdown__muted">Dat telt. Meer hoeft niet.</p>
                </>
              )}
            </section>
          ) : null}

          {phase === "sentiment" ? (
            <section className="v2-shutdown__card v2-fade" aria-live="polite">
              <p className="v2-shutdown__question">Voelde dit rustig?</p>
              <p className="v2-shutdown__muted">Optioneel. Geen goed of fout antwoord.</p>
            </section>
          ) : null}

          {phase === "dump" ? (
            <section className="v2-shutdown__card" aria-live="polite">
              <label htmlFor="v2-shutdown-dump" className="v2-shutdown__body">
                Nog iets uit je hoofd?
              </label>
              <p className="v2-shutdown__muted">
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
          ) : null}
        </div>

        <div className="v2-shutdown__dock">
          {phase === "review" ? (
            <>
              <button type="button" onClick={goToSentimentOrDump} className="btn-primary w-full">
                Verder
              </button>
              <button type="button" onClick={finishShutdown} className="v2-link">
                Overslaan, dag is rond
              </button>
            </>
          ) : null}

          {phase === "sentiment" ? (
            <>
              <button type="button" onClick={confirmCalm} className="btn-primary w-full">
                Ja, rustig
              </button>
              <button type="button" onClick={confirmNotCalm} className="v2-link">
                Niet echt
              </button>
              <button type="button" onClick={skipSentiment} className="v2-link">
                Overslaan
              </button>
            </>
          ) : null}

          {phase === "dump" ? (
            <>
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
                className="v2-link"
              >
                Naar home zonder dump
              </button>
            </>
          ) : null}
        </div>
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
