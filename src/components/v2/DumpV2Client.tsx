"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useI18n } from "@/lib/i18n";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { createV2SpeechSession, isV2SpeechAvailable } from "./v2Voice";
import {
  addV2DumpItems,
  clearV2DumpDraft,
  clearV2DumpPendingId,
  isV2DumpAged,
  isV2EveningLocal,
  loadV2Dump,
  loadV2DumpDraft,
  removeV2DumpItem,
  saveV2Dump,
  saveV2DumpDraft,
  v2DumpAtMax,
  v2DumpSoftWarn,
  type V2DumpItem,
} from "./v2Dump";
import { prepareDumpItems } from "./v2DumpSplit";
import { trackV2EveningDumpAdded } from "./v2Analytics";
import { emptyDraft, loadV2Tasks, saveV2Tasks } from "./v2Tasks";

type Toast =
  | { kind: "added"; text: string }
  | { kind: "today"; text: string }
  | { kind: "task"; text: string }
  | { kind: "rest"; text: string }
  | { kind: "undo"; item: V2DumpItem };

const UNDO_MS = 5000;

function newestFirst(a: V2DumpItem, b: V2DumpItem): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export default function DumpV2Client() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const captureOnMount = searchParams.get("capture") === "1";

  const [items, setItems] = useState<V2DumpItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedHint, setSavedHint] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceLive, setVoiceLive] = useState("");
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [voiceFallbackText, setVoiceFallbackText] = useState("");
  const speechRef = useRef<ReturnType<typeof createV2SpeechSession> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);

  const persist = useCallback((next: V2DumpItem[]) => {
    setItems(next);
    saveV2Dump(next);
  }, []);

  useEffect(() => {
    if (loaded) return;
    persist(loadV2Dump());
    // Legacy disposition-gate opruimen; dump mag weer vrij stapelen.
    clearV2DumpPendingId();
    setDraft(loadV2DumpDraft());
    setLoaded(true);
  }, [loaded, persist]);

  useEffect(() => {
    setSpeechOk(isV2SpeechAvailable());
  }, []);

  useEffect(() => {
    if (!loaded || !captureOnMount) return;
    inputRef.current?.focus();
  }, [loaded, captureOnMount]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveV2DumpDraft(draft);
  }, [draft, loaded]);

  const showSavedHint = useCallback(() => {
    setSavedHint(true);
    if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current);
    savedHintTimerRef.current = setTimeout(() => setSavedHint(false), 2000);
  }, []);

  const showToast = useCallback((next: Toast) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setToast(next);
    if (next.kind === "undo") {
      undoTimerRef.current = setTimeout(() => setToast(null), UNDO_MS);
    } else {
      undoTimerRef.current = setTimeout(() => setToast(null), 3200);
    }
  }, []);

  const atMax = v2DumpAtMax(items);
  const captureBlocked = atMax;

  const commitDump = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return false;
      if (v2DumpAtMax(items)) {
        showToast({
          kind: "added",
          text: t("v2.dumpToastFull"),
        });
        return false;
      }

      const pieces = prepareDumpItems(trimmed);
      if (pieces.length === 0) {
        showToast({
          kind: "added",
          text: t("v2.dumpToastOnlyFillers"),
        });
        return false;
      }

      const result = addV2DumpItems(pieces, items);
      if (result.added === 0) {
        showToast({
          kind: "added",
          text: t("v2.dumpToastFull"),
        });
        return false;
      }

      persist(result.items);
      if (isV2EveningLocal()) {
        trackV2EveningDumpAdded({
          source: "dump",
          contentLength: trimmed.length,
        });
      }
      showSavedHint();

      let toastText = t("v2.dumpToastOne");
      if (result.added > 1 && result.truncated === 0) {
        toastText = t("v2.dumpToastMany", { n: String(result.added) });
      } else if (result.truncated > 0) {
        toastText = t("v2.dumpToastPartial", {
          n: String(result.added),
          m: String(result.attempted),
        });
      }
      showToast({ kind: "added", text: toastText });
      return true;
    },
    [items, persist, showSavedHint, showToast, t],
  );

  const flushDraft = useCallback(() => {
    if (flushingRef.current) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    flushingRef.current = true;
    const ok = commitDump(trimmed);
    if (ok) {
      setDraft("");
      clearV2DumpDraft();
      inputRef.current?.focus();
    }
    flushingRef.current = false;
  }, [commitDump, draft]);

  const createTaskFromDump = useCallback(
    (item: V2DumpItem, nextItems: V2DumpItem[]) => {
      const tasks = loadV2Tasks();
      const seed = emptyDraft();
      seed.title = item.content;
      saveV2Tasks([...tasks, seed]);
      persist(nextItems);
      showToast({ kind: "task", text: t("v2.dumpToastTask") });
    },
    [persist, showToast, t],
  );

  const handleTask = (item: V2DumpItem) => {
    createTaskFromDump(item, removeV2DumpItem(item.id, items));
  };

  const handleDelete = (item: V2DumpItem) => {
    persist(removeV2DumpItem(item.id, items));
    showToast({ kind: "undo", item });
  };

  const handleUndo = () => {
    if (!toast || toast.kind !== "undo") return;
    const restored = [...items, toast.item].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    persist(restored);
    setToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const addVoiceDump = useCallback(
    (text: string) => {
      commitDump(text);
    },
    [commitDump],
  );

  const stopVoiceRecording = useCallback(() => {
    speechRef.current?.stop();
  }, []);

  const startVoiceRecording = useCallback(() => {
    if (voiceRecording || voiceProcessing || captureBlocked) return;
    setVoiceFallback(false);
    setVoiceFallbackText("");
    setVoiceLive("");

    const session = createV2SpeechSession(
      (text) => {
        speechRef.current = null;
        setVoiceRecording(false);
        setVoiceLive("");
        setVoiceProcessing(true);
        // Defer so "Even ordenen…" paints before sync split/save.
        window.setTimeout(() => {
          addVoiceDump(text);
          setVoiceProcessing(false);
        }, 40);
      },
      (msg) => {
        speechRef.current = null;
        setVoiceRecording(false);
        setVoiceProcessing(false);
        setVoiceLive("");
        setVoiceFallback(true);
        if (msg.length > 0) {
          showToast({ kind: "added", text: msg });
        }
      },
      {
        locale,
        messages: {
          nothingHeard: t("v2.dumpVoiceNothingHeard"),
          speechStopped: t("v2.dumpVoiceSpeechStopped"),
          recognitionFailed: t("v2.dumpVoiceFailed"),
          micFailed: t("v2.dumpVoiceMicFailed"),
        },
        onPartial: (text) => {
          setVoiceLive(text);
        },
        onWillFlush: () => {
          setVoiceRecording(false);
          setVoiceProcessing(true);
        },
      },
    );

    if (!session) {
      setVoiceProcessing(false);
      setVoiceFallback(true);
      return;
    }

    speechRef.current = session;
    setVoiceRecording(true);
    session.start();
  }, [
    addVoiceDump,
    captureBlocked,
    locale,
    showToast,
    t,
    voiceProcessing,
    voiceRecording,
  ]);

  useEffect(() => {
    return () => {
      speechRef.current?.stop();
    };
  }, []);

  const visibleItems = items
    .filter((i) => i.disposition !== "today")
    .slice()
    .sort(newestFirst);
  const softWarn = v2DumpSoftWarn(items);

  const canSave = draft.trim().length > 0 && !captureBlocked;

  return (
    <V2AppShell>
      <div className="v2-dump">
        <div className="v2-dump__hero">
          <header>
            <div className="v2-info-head">
              <V2Eyebrow>Extern geheugen</V2Eyebrow>
              <V2InfoHint
                infoId="v2_dump_extern_geheugen"
                expanded={infoOpen}
                onToggle={() => setInfoOpen((v) => !v)}
                expandLabel={V2_INFO_SHEETS.dump.openAria}
                collapseLabel={V2_INFO_SHEETS.dump.closeAria}
                controlsId="v2-dump-info-sheet"
              />
            </div>
            <h1 className="v2-serif mt-2" style={{ fontSize: "var(--fs-display)" }}>
              Dump
            </h1>
            <p className="v2-dump__lead">
              Leg vast wat in je hoofd zit. Structuur hoeft niet.
            </p>
          </header>

          <section className="v2-dump__card">
            <label htmlFor="v2-dump-capture" className="sr-only">
              Nieuwe gedachte
            </label>
            <textarea
              id="v2-dump-capture"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  flushDraft();
                }
              }}
              placeholder="Wat zit er in je hoofd?"
              className="v2-dump__field"
              disabled={captureBlocked || voiceRecording || voiceProcessing}
              autoComplete="off"
              rows={4}
              /* Browser herstelt soms een inline height na resize → hydration mismatch. */
              suppressHydrationWarning
            />
            <div className="v2-dump__meta">
              {savedHint ? (
                <p className="v2-dump__hint v2-dump__hint--saved" aria-live="polite">
                  Bewaard
                </p>
              ) : atMax ? (
                <p className="v2-dump__hint" aria-live="polite">
                  Lijst vol (max. 15). Maak eerst ruimte.
                </p>
              ) : (
                <p className="v2-dump__hint">
                  Typ en bewaar. Later kun je er een taak van maken, of verwijderen.
                </p>
              )}
              {speechOk ? (
                <button
                  type="button"
                  onClick={voiceRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={captureBlocked || voiceProcessing}
                  className="v2-dump__mic"
                  aria-label={
                    voiceRecording ? t("v2.dumpVoiceMicStop") : t("v2.dumpVoiceMicStart")
                  }
                  aria-pressed={voiceRecording}
                >
                  <MicIcon />
                </button>
              ) : null}
            </div>

            {voiceRecording ? (
              <div
                className="mt-4 flex flex-col items-center gap-2 py-2 text-center"
                aria-live="polite"
              >
                <div
                  className="v2-voice-blob flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(45, 90, 86, 0.12)",
                    border: "1px solid var(--border)",
                  }}
                  aria-hidden
                />
                <p
                  className="text-[15px] font-medium leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {t("v2.dumpVoiceListeningTitle")}
                </p>
                <p className="max-w-[22rem] text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {t("v2.dumpVoiceListeningHint")}
                </p>
                {voiceLive.trim().length > 0 ? (
                  <p
                    className="mt-1 max-w-[22rem] text-[13px] leading-snug"
                    style={{ color: "var(--accent)" }}
                    aria-label={t("v2.dumpVoiceLiveAria")}
                  >
                    {voiceLive}
                  </p>
                ) : null}
              </div>
            ) : null}

            {voiceProcessing ? (
              <p
                className="mt-3 text-center text-[14px]"
                style={{ color: "var(--accent)" }}
                aria-live="polite"
              >
                {t("v2.dumpVoiceProcessing")}
              </p>
            ) : null}

            {voiceFallback ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {speechOk
                    ? t("v2.dumpVoiceFallbackHint")
                    : t("v2.dumpVoiceFallbackUnavailable")}
                </p>
                <input
                  type="text"
                  value={voiceFallbackText}
                  onChange={(e) => setVoiceFallbackText(e.target.value)}
                  placeholder={t("v2.dumpVoiceFallbackPh")}
                  className="v2-field min-h-[44px] w-full"
                  style={{ border: "1px solid var(--border)" }}
                  autoComplete="off"
                  disabled={captureBlocked}
                />
                <button
                  type="button"
                  onClick={() => {
                    addVoiceDump(voiceFallbackText);
                    setVoiceFallback(false);
                    setVoiceFallbackText("");
                  }}
                  disabled={captureBlocked || voiceFallbackText.trim().length === 0}
                  className="btn-ghost w-full"
                >
                  {t("v2.dumpVoiceFallbackSave")}
                </button>
              </div>
            ) : null}
          </section>

          <div className="v2-dump__cta-wrap">
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!canSave}
              onClick={() => {
                flushDraft();
              }}
            >
              Bewaren
            </button>
            <p className="v2-dump__footnote">
              Dump vrij. Maximaal 15. Maak er later een taak van, of verwijder.
            </p>
          </div>
        </div>

        <div className="v2-dump__more">
          {softWarn ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {atMax
                ? "Lijst vol (max. 15). Kies iets om ruimte te maken."
                : "De lijst wordt lang. Geen haast, maar een zachte herinnering."}
            </p>
          ) : null}

          {visibleItems.length === 0 ? (
            <section className="v2-card v2-fade p-6 text-center">
              <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
                Leeg hoofd, of alles al vastgelegd.
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Typ hierboven als er iets binnenkomt. Er is geen minimum.
              </p>
            </section>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visibleItems.map((item) => (
                <DumpRow
                  key={item.id}
                  item={item}
                  onTask={() => handleTask(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          )}
        </div>

        {toast ? (
          <div
            className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-1/2 z-[130] flex max-w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] shadow-sm"
            style={{
              background: "var(--ink)",
              color: "var(--text-on-ink)",
              border: "1px solid var(--border)",
            }}
            role="status"
            aria-live="polite"
          >
            <span className="flex-1">
              {toast.kind === "undo" ? t("v2.dumpToastDeleted") : toast.text}
            </span>
            {toast.kind === "undo" ? (
              <button
                type="button"
                onClick={handleUndo}
                className="shrink-0 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: "rgba(255,255,255,0.15)", color: "var(--text-on-ink)" }}
              >
                Ongedaan
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <V2InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        eyebrow={V2_INFO_SHEETS.dump.eyebrow}
        title={V2_INFO_SHEETS.dump.title}
        rows={V2_INFO_SHEETS.dump.rows}
        gotItLabel={V2_INFO_SHEETS.dump.gotIt}
        closeAria={V2_INFO_SHEETS.dump.closeAria}
        panelId="v2-dump-info-sheet"
      />
    </V2AppShell>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v4" />
    </svg>
  );
}

function DumpRow({
  item,
  onTask,
  onDelete,
}: {
  item: V2DumpItem;
  onTask: () => void;
  onDelete: () => void;
}) {
  const aged = isV2DumpAged(item);
  const resting = item.disposition === "rest";

  return (
    <article
      className={[
        "v2-fade v2-dump__row",
        aged && !resting ? "v2-dump__row--aged" : "",
        resting ? "v2-dump__row--resting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[15px] leading-snug"
            style={{ color: resting ? "var(--text-muted)" : "var(--text)" }}
          >
            {item.content}
          </p>
          {aged && !resting ? (
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
              Al een tijdje
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SoftAction label="Maak taak" onClick={onTask} />
        <SoftAction label="Verwijderen" onClick={onDelete} muted />
      </div>
    </article>
  );
}

function SoftAction({
  label,
  onClick,
  muted = false,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[13px] font-medium"
      style={{
        border: "1px solid var(--border)",
        background: muted ? "transparent" : "var(--accent-soft)",
        color: muted ? "var(--text-muted)" : "var(--accent)",
      }}
    >
      {label}
    </button>
  );
}
