"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
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
import {
  isV2TaskVisible,
  loadV2Tasks,
  saveV2Tasks,
  todayYmd,
  V2_SNOOZE_REST,
  v2SnoozeUntilTomorrowMorning,
  type V2Task,
} from "./v2Tasks";
import {
  trackV2EveningDumpAdded,
  trackV2ShutdownCompleted,
} from "./v2Analytics";
import { markV2FirstValue } from "./v2CycleOptInPrompt";
import { markReturnPermissionPending, shouldOfferReturnPermission } from "./v2ReturnPermission";
import { collectWins } from "./v2ShutdownWins";
import { loadV2DoneTally } from "./v2DoneTally";
import { v2PrefersReducedMotion } from "./v2DoneAck";
import {
  clearV2ShutdownInPlace,
  v2ShutdownFromLastTask,
} from "./v2LastTaskShutdown";

type Phase = "ack" | "park";
type Sheet = "actions" | "confirm" | null;

const ACK_PLAYED_KEY = "v2_shutdown_ack_played";

const TICK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4.5 12.6l5 5.2L19.5 6.6"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CHEVRON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9.5 5.5l6.5 6.5-6.5 6.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function ackPlayedToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ACK_PLAYED_KEY) === todayYmd();
  } catch {
    return true;
  }
}

function markAckPlayedToday(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACK_PLAYED_KEY, todayYmd());
  } catch {
    /* negeren */
  }
}

function persistTasks(next: V2Task[]) {
  saveV2Tasks(next);
}

export default function ShutdownV2Client({
  embedded = false,
  onExit,
}: {
  /** Zonder eigen shell: home speelt het ritueel in-place. */
  embedded?: boolean;
  onExit?: () => void;
}) {
  const { t } = useI18n();
  const go = useV2Go();
  const [phase, setPhase] = useState<Phase>("ack");
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [play, setPlay] = useState(false);
  const [carry, setCarry] = useState<Record<string, boolean>>({});
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpText, setDumpText] = useState("");
  const [dumpSaved, setDumpSaved] = useState(false);
  const [dumpAdded, setDumpAdded] = useState(false);
  const dumpRef = useRef<HTMLTextAreaElement | null>(null);
  const dumpOpenRef = useRef(false);
  dumpOpenRef.current = dumpOpen;

  useEffect(() => {
    const loaded = loadV2Tasks();
    setTasks(loaded);
    const open = loaded.filter((task) => !task.done && isV2TaskVisible(task));
    setOpenIds(open.map((task) => task.id));
    setCarry(Object.fromEntries(open.map((task) => [task.id, true])));
    const reduced = v2PrefersReducedMotion();
    const already = ackPlayedToday();
    const fromLastTask = embedded || v2ShutdownFromLastTask();
    if (!reduced && (!already || fromLastTask)) {
      const id = window.requestAnimationFrame(() => setPlay(true));
      markAckPlayedToday();
      return () => window.cancelAnimationFrame(id);
    }
    markAckPlayedToday();
  }, [embedded]);

  useEffect(() => {
    scrollV2ToTop();
  }, [phase]);

  const wins = useMemo(() => collectWins(tasks), [tasks]);
  const tally = useMemo(() => loadV2DoneTally(), [tasks]);
  const openRows = useMemo(
    () => openIds.map((id) => tasks.find((task) => task.id === id)).filter((task): task is V2Task => Boolean(task)),
    [openIds, tasks],
  );
  const pending = pendingId ? tasks.find((task) => task.id === pendingId) ?? null : null;

  const closeSheets = () => {
    setSheet(null);
    setPendingId(null);
  };

  const patchTask = (id: string, patch: Partial<V2Task>) => {
    setTasks((prev) => {
      const next = prev.map((task) => (task.id === id ? { ...task, ...patch } : task));
      persistTasks(next);
      return next;
    });
  };

  const openActions = (id: string) => {
    setPendingId(id);
    setSheet("actions");
  };

  const applyCarry = (id: string, nextCarry: boolean) => {
    setCarry((prev) => ({ ...prev, [id]: nextCarry }));
    patchTask(id, { snoozeUntil: nextCarry ? null : V2_SNOOZE_REST });
    closeSheets();
  };

  const confirmDelete = () => {
    if (!pendingId) return;
    setTasks((prev) => {
      const next = prev.filter((task) => task.id !== pendingId);
      persistTasks(next);
      return next;
    });
    setOpenIds((prev) => prev.filter((id) => id !== pendingId));
    closeSheets();
  };

  const storeDump = useCallback(() => {
    const trimmed = dumpText.trim();
    setDumpText("");
    setDumpOpen(false);
    if (!trimmed) return;
    const items = loadV2Dump();
    if (v2DumpAtMax(items)) return;
    saveV2Dump(addV2DumpItem(trimmed, items));
    setDumpAdded(true);
    setDumpSaved(true);
    if (isV2EveningLocal()) {
      trackV2EveningDumpAdded({ source: "shutdown", contentLength: trimmed.length });
    }
  }, [dumpText]);

  const finishShutdown = () => {
    if (dumpOpen) storeDump();
    setTasks((prev) => {
      const next = prev.map((task) => {
        if (task.done || !openIds.includes(task.id)) return task;
        if (carry[task.id] === false) {
          return { ...task, snoozeUntil: V2_SNOOZE_REST };
        }
        return { ...task, snoozeUntil: v2SnoozeUntilTomorrowMorning() };
      });
      persistTasks(next);
      return next;
    });
    trackV2ShutdownCompleted({ winCount: wins.length, dumpAdded });
    markV2FirstValue();
    if (wins.length >= 1 && shouldOfferReturnPermission()) {
      markReturnPermissionPending();
    }
    clearV2ShutdownInPlace();
    onExit?.();
    go("/", { todayDone: true });
  };

  const totalsDelayMs = 300 + wins.length * 150;

  const body = (
    <>
      <div className={`v2-shutdown${play && phase === "ack" ? " is-play" : ""}`}>
        {phase === "ack" ? (
          <>
            <div className="v2-shutdown__page">
              <div className="v2-info-head">
                <V2Eyebrow>{t("v2.shutdownEyebrow")}</V2Eyebrow>
                <V2InfoHint
                  infoId="v2_shutdown"
                  expanded={infoOpen}
                  onToggle={() => setInfoOpen((v) => !v)}
                  expandLabel={V2_INFO_SHEETS.shutdown.openAria}
                  collapseLabel={V2_INFO_SHEETS.shutdown.closeAria}
                  controlsId="v2-shutdown-info-sheet"
                />
              </div>
              <h1 className="v2-shutdown__title">{t("v2.shutdownTitleAck")}</h1>
              <p className="v2-shutdown__lede">{t("v2.shutdownLede")}</p>
              {wins.length === 0 ? (
                <p className="v2-shutdown__empty">{t("v2.shutdownEmpty")}</p>
              ) : (
                <div className="v2-shutdown-dones">
                  {wins.map((win, i) => (
                    <div
                      key={win.id}
                      className="v2-shutdown-dones__row"
                      style={{ animationDelay: `${260 + i * 150}ms` }}
                    >
                      <span className="v2-shutdown-dones__tick" aria-hidden>
                        {TICK}
                      </span>
                      <span className="v2-shutdown-dones__name">{win.label}</span>
                      {win.at ? (
                        <span className="v2-shutdown-dones__time">{win.at}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <div
                className="v2-shutdown-totals"
                style={{ animationDelay: `${totalsDelayMs}ms` }}
              >
                <div className="v2-shutdown-totals__item">
                  <b>{tally.weekCount}</b>
                  <span>{t("v2.shutdownWeek")}</span>
                </div>
                <div className="v2-shutdown-totals__item">
                  <b>{tally.monthCount}</b>
                  <span>{t("v2.shutdownMonth")}</span>
                </div>
                <div className="v2-shutdown-totals__item">
                  <b>{tally.yearCount}</b>
                  <span>{t("v2.shutdownYear")}</span>
                </div>
              </div>
            </div>
            <div className="v2-shutdown__foot">
              <button
                type="button"
                className="v2-shutdown__primary"
                onClick={() => setPhase("park")}
              >
                {t("v2.shutdownSeeOpen")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="v2-shutdown__page v2-shutdown__page--park">
              <div className="v2-info-head">
                <V2Eyebrow>{t("v2.shutdownEyebrow")}</V2Eyebrow>
                <V2InfoHint
                  infoId="v2_shutdown"
                  expanded={infoOpen}
                  onToggle={() => setInfoOpen((v) => !v)}
                  expandLabel={V2_INFO_SHEETS.shutdown.openAria}
                  collapseLabel={V2_INFO_SHEETS.shutdown.closeAria}
                  controlsId="v2-shutdown-info-sheet"
                />
              </div>
              <h1 className="v2-shutdown__title">{t("v2.shutdownTitlePark")}</h1>
              {openRows.length > 0 ? (
                <>
                  <p className="v2-shutdown__slab">{t("v2.shutdownOpenSlab")}</p>
                  <div className="v2-shutdown-keep">
                    {openRows.map((task) => {
                      const isCarry = carry[task.id] !== false;
                      return (
                        <div
                          key={task.id}
                          className={`v2-shutdown-keep__row${isCarry ? "" : " is-off"}`}
                        >
                          <span className="v2-shutdown-keep__name">{task.title}</span>
                          <button
                            type="button"
                            className={`v2-shutdown-pill${isCarry ? "" : " is-off"}`}
                            onClick={() => openActions(task.id)}
                            aria-label={t("v2.shutdownChipAria", { title: task.title })}
                          >
                            <i aria-hidden />
                            {isCarry ? t("v2.shutdownCarry") : t("v2.shutdownRest")}
                            {CHEVRON}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="v2-shutdown__note">{t("v2.shutdownParkNote")}</p>
                </>
              ) : null}
              {!dumpOpen ? (
                <button
                  type="button"
                  className="v2-shutdown-addlink"
                  onClick={() => {
                    setDumpOpen(true);
                    setDumpSaved(false);
                    window.setTimeout(() => dumpRef.current?.focus(), 40);
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t("v2.shutdownDumpLink")}
                </button>
              ) : null}
              <div className={`v2-shutdown-dump${dumpOpen ? " is-open" : ""}`}>
                <h2>{t("v2.shutdownDumpTitle")}</h2>
                <textarea
                  ref={dumpRef}
                  rows={2}
                  value={dumpText}
                  onChange={(e) => setDumpText(e.target.value)}
                  onBlur={() => {
                    if (dumpOpenRef.current) storeDump();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      storeDump();
                    }
                  }}
                  tabIndex={dumpOpen ? 0 : -1}
                  aria-hidden={!dumpOpen}
                  placeholder={t("v2.shutdownDumpPh")}
                />
                <p className="v2-shutdown-dump__hint">{t("v2.shutdownDumpHint")}</p>
              </div>
              {dumpSaved ? (
                <p className="v2-shutdown-saved">
                  <i aria-hidden>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4.5 12.6l5 5.2L19.5 6.6"
                        stroke="currentColor"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </i>
                  {t("v2.shutdownDumpSaved")}
                </p>
              ) : null}
            </div>
            <div className="v2-shutdown__foot">
              <button type="button" className="v2-shutdown__primary" onClick={finishShutdown}>
                {t("v2.shutdownFinish")}
              </button>
              <button
                type="button"
                className="v2-shutdown__quiet"
                onClick={() => {
                  clearV2ShutdownInPlace();
                  onExit?.();
                  go("/");
                }}
              >
                {t("v2.shutdownBackHome")}
              </button>
            </div>
            <button
              type="button"
              className={`v2-shutdown-dim${sheet ? " is-on" : ""}`}
              aria-label={t("v2.shutdownCancel")}
              aria-hidden={!sheet}
              tabIndex={sheet ? 0 : -1}
              onClick={closeSheets}
            />
            <div
              className={`v2-shutdown-sheet${sheet === "actions" ? " is-on" : ""}`}
              role="dialog"
              aria-modal={sheet === "actions"}
              aria-labelledby="v2-shutdown-actions-title"
              hidden={sheet !== "actions"}
            >
              <div className="v2-shutdown-sheet__grip" aria-hidden />
              <h2 id="v2-shutdown-actions-title">{t("v2.shutdownSheetTitle")}</h2>
              {pending ? <p>{pending.title}</p> : null}
              <div className="v2-shutdown-opts">
                <button type="button" onClick={() => pendingId && applyCarry(pendingId, true)}>
                  <b>{t("v2.shutdownActCarry")}</b>
                  <span>{t("v2.shutdownActCarryHint")}</span>
                </button>
                <button type="button" onClick={() => pendingId && applyCarry(pendingId, false)}>
                  <b>{t("v2.shutdownActRest")}</b>
                  <span>{t("v2.shutdownActRestHint")}</span>
                </button>
                <button type="button" onClick={() => setSheet("confirm")}>
                  <b>{t("v2.shutdownActDrop")}</b>
                  <span>{t("v2.shutdownActDropHint")}</span>
                </button>
              </div>
            </div>
            <div
              className={`v2-shutdown-sheet${sheet === "confirm" ? " is-on" : ""}`}
              role="dialog"
              aria-modal={sheet === "confirm"}
              aria-labelledby="v2-shutdown-confirm-title"
              hidden={sheet !== "confirm"}
            >
              <h2 id="v2-shutdown-confirm-title">{t("v2.shutdownDeleteTitle")}</h2>
              <p>{t("v2.shutdownDeleteBody")}</p>
              <button type="button" className="v2-shutdown__outline" onClick={confirmDelete}>
                {t("v2.shutdownDelete")}
              </button>
              <button type="button" className="v2-shutdown__quiet" onClick={closeSheets}>
                {t("v2.shutdownCancel")}
              </button>
            </div>
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
    </>
  );

  if (embedded) return body;
  return <V2AppShell scroll={false}>{body}</V2AppShell>;
}
