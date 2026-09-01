"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "next/navigation";

import { triggerHaptic } from "@/lib/haptics";
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
  isV2DumpVoiceItem,
  isV2EveningLocal,
  loadV2Dump,
  loadV2DumpDraft,
  removeV2DumpItem,
  saveV2Dump,
  saveV2DumpDraft,
  v2DumpAtMax,
  v2DumpPreviewItems,
  v2DumpVisibleItems,
  type V2DumpItem,
  type V2DumpSource,
} from "./v2Dump";
import {
  formatV2DumpClock,
  resolveV2DumpVoiceCapture,
  V2_DUMP_HOLD_SILENCE_MS,
} from "./v2DumpCapture";
import { promoteDumpItemToTask } from "./v2DumpToTask";
import { prepareDumpItems } from "./v2DumpSplit";
import { trackV2EveningDumpAdded } from "./v2Analytics";
import { loadV2Tasks, saveV2Tasks } from "./v2Tasks";

type Toast =
  | { kind: "added"; text: string }
  | { kind: "task"; text: string }
  | { kind: "undo"; item: V2DumpItem };

const UNDO_MS = 5000;

export default function DumpV2Client() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const captureOnMount = searchParams.get("capture") === "1";

  const [items, setItems] = useState<V2DumpItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [view, setView] = useState<"capture" | "all">("capture");
  const [toast, setToast] = useState<Toast | null>(null);
  const [recording, setRecording] = useState(false);
  const [riseFirst, setRiseFirst] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const speechRef = useRef<ReturnType<typeof createV2SpeechSession> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const riseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);
  const holdingRef = useRef(false);
  const finishingRef = useRef(false);
  const holdStartedAtRef = useRef(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const persist = useCallback((next: V2DumpItem[]) => {
    setItems(next);
    saveV2Dump(next);
  }, []);

  useEffect(() => {
    if (loaded) return;
    persist(loadV2Dump());
    clearV2DumpPendingId();
    const storedDraft = loadV2DumpDraft();
    setDraft(storedDraft);
    if (storedDraft.trim().length > 0 || captureOnMount) {
      setTypeOpen(true);
    }
    setLoaded(true);
  }, [captureOnMount, loaded, persist]);

  useEffect(() => {
    const onHydrated = () => setItems(loadV2Dump());
    window.addEventListener("v2-remote-hydrated", onHydrated);
    return () => window.removeEventListener("v2-remote-hydrated", onHydrated);
  }, []);

  useEffect(() => {
    if (!loaded || !typeOpen) return;
    inputRef.current?.focus();
  }, [loaded, typeOpen]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (riseTimerRef.current) clearTimeout(riseTimerRef.current);
      speechRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveV2DumpDraft(draft);
  }, [draft, loaded]);

  const showToast = useCallback((next: Toast) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setToast(next);
    undoTimerRef.current = setTimeout(
      () => setToast(null),
      next.kind === "undo" ? UNDO_MS : 3200,
    );
  }, []);

  const markRise = useCallback(() => {
    setRiseFirst(true);
    if (riseTimerRef.current) clearTimeout(riseTimerRef.current);
    riseTimerRef.current = setTimeout(() => setRiseFirst(false), 420);
  }, []);

  const visibleItems = v2DumpVisibleItems(items);
  const previewItems = v2DumpPreviewItems(items);
  const atMax = v2DumpAtMax(items);
  const captureBlocked = atMax;

  const commitPieces = useCallback(
    (pieces: string[], source: V2DumpSource, contentLength: number) => {
      if (pieces.length === 0) return false;
      if (v2DumpAtMax(itemsRef.current)) {
        showToast({ kind: "added", text: t("v2.dumpToastFull") });
        return false;
      }

      const result = addV2DumpItems(pieces, itemsRef.current, source);
      if (result.added === 0) {
        showToast({ kind: "added", text: t("v2.dumpToastFull") });
        return false;
      }

      persist(result.items);
      if (isV2EveningLocal()) {
        trackV2EveningDumpAdded({
          source: "dump",
          contentLength,
        });
      }
      triggerHaptic(14, { respectReducedMotion: true });
      markRise();

      if (result.truncated > 0) {
        showToast({
          kind: "added",
          text: t("v2.dumpToastPartial", {
            n: String(result.added),
            m: String(result.attempted),
          }),
        });
      }
      return true;
    },
    [markRise, persist, showToast, t],
  );

  const commitTyped = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return false;
      const pieces = prepareDumpItems(trimmed);
      if (pieces.length === 0) return false;
      return commitPieces(pieces, "text", trimmed.length);
    },
    [commitPieces],
  );

  const flushDraft = useCallback(() => {
    if (flushingRef.current) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    flushingRef.current = true;
    const ok = commitTyped(trimmed);
    if (ok) {
      setDraft("");
      clearV2DumpDraft();
      setTypeOpen(false);
    }
    flushingRef.current = false;
  }, [commitTyped, draft]);

  const handleTask = (item: V2DumpItem) => {
    const result = promoteDumpItemToTask(
      item,
      itemsRef.current,
      loadV2Tasks(),
    );
    persist(result.dumpItems);
    saveV2Tasks(result.tasks);
    triggerHaptic(10, { respectReducedMotion: true });
    showToast({ kind: "task", text: t("v2.dumpToastTask") });
  };

  const handleDelete = (item: V2DumpItem) => {
    persist(removeV2DumpItem(item.id, itemsRef.current));
    showToast({ kind: "undo", item });
  };

  const handleUndo = () => {
    if (!toast || toast.kind !== "undo") return;
    const restored = [...items, toast.item].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    persist(restored);
    setToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const finishVoiceCapture = useCallback(
    (
      transcript: string,
      opts?: { errorMessage?: string; persistError?: boolean },
    ) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const durationMs = Date.now() - holdStartedAtRef.current;
      const { pieces, reason } = resolveV2DumpVoiceCapture(transcript, durationMs);

      if (pieces.length > 0) {
        commitPieces(pieces, "voice", (transcript || pieces[0]).length);
        finishingRef.current = false;
        return;
      }

      if (reason === "ignore" && !opts?.persistError) {
        finishingRef.current = false;
        return;
      }

      const errorText =
        opts?.errorMessage?.trim() ||
        (reason === "fillers"
          ? t("v2.dumpToastOnlyFillers")
          : t("v2.dumpToastNothingHeard"));
      showToast({ kind: "added", text: errorText });
      finishingRef.current = false;
    },
    [commitPieces, showToast, t],
  );

  const startHold = useCallback(() => {
    if (holdingRef.current || finishingRef.current || captureBlocked) return;

    if (!isV2SpeechAvailable()) {
      showToast({ kind: "added", text: t("v2.dumpToastSpeechUnavailable") });
      return;
    }

    holdingRef.current = true;
    finishingRef.current = false;
    holdStartedAtRef.current = Date.now();

    const session = createV2SpeechSession(
      (text) => {
        speechRef.current = null;
        setRecording(false);
        holdingRef.current = false;
        finishVoiceCapture(text);
      },
      (message, kind) => {
        speechRef.current = null;
        setRecording(false);
        holdingRef.current = false;
        finishVoiceCapture("", {
          errorMessage: message,
          persistError: kind === "mic-failed" || kind === "recognition-failed",
        });
      },
      {
        locale,
        silenceAfterSpeechMs: V2_DUMP_HOLD_SILENCE_MS,
        silenceBeforeSpeechMs: V2_DUMP_HOLD_SILENCE_MS,
        messages: {
          nothingHeard: t("v2.dumpToastNothingHeard"),
          speechStopped: t("v2.dumpToastSpeechFailed"),
          recognitionFailed: t("v2.dumpToastSpeechFailed"),
          micFailed: t("v2.dumpToastMicFailed"),
        },
      },
    );

    if (!session) {
      holdingRef.current = false;
      showToast({ kind: "added", text: t("v2.dumpToastSpeechUnavailable") });
      return;
    }

    setRecording(true);
    if (!draftRef.current.trim()) setTypeOpen(false);
    triggerHaptic(10, { respectReducedMotion: true });

    speechRef.current = session;
    session.start();
  }, [captureBlocked, finishVoiceCapture, locale, showToast, t]);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setRecording(false);

    if (speechRef.current) {
      speechRef.current.stop();
      return;
    }

    finishVoiceCapture("");
  }, [finishVoiceCapture]);

  useEffect(() => {
    const onUp = () => endHold();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [endHold]);

  const onMicPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button > 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // oudere browsers
    }
    startHold();
  };

  const onMicKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    startHold();
  };

  const onMicKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    endHold();
  };

  const openType = () => {
    if (recording) return;
    setTypeOpen(true);
  };

  const holdLabel = captureBlocked
    ? t("v2.dumpHoldFull")
    : recording
      ? t("v2.dumpHoldListening")
      : t("v2.dumpHold");

  return (
    <V2AppShell scroll={false}>
      {view === "all" ? (
        <div className="v2-dump v2-dump--all">
          <div className="v2-dump__all-head">
            <button
              type="button"
              className="v2-dump__all-back"
              onClick={() => setView("capture")}
              aria-label={t("v2.dumpAllBackAria")}
            >
              {t("v2.dumpAllBack")}
            </button>
            <span className="v2-dump__lhead-label">{t("v2.dumpAllTitle")}</span>
          </div>
          {visibleItems.length === 0 ? (
            <p className="v2-dump__empty">{t("v2.dumpEmpty")}</p>
          ) : (
            <div>
              {visibleItems.map((item) => (
                <DumpItemRow
                  key={item.id}
                  item={item}
                  wrap
                  makeTaskLabel={t("v2.dumpMakeTask")}
                  deleteLabel={t("v2.dumpDelete")}
                  onTask={() => handleTask(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`v2-dump${recording ? " is-rec" : ""}`}>
          <div className="v2-dump__top">
            <div className="v2-info-head">
              <V2Eyebrow>{t("v2.dumpEyebrow")}</V2Eyebrow>
              <V2InfoHint
                infoId="v2_dump_extern_geheugen"
                expanded={infoOpen}
                onToggle={() => setInfoOpen((v) => !v)}
                expandLabel={V2_INFO_SHEETS.dump.openAria}
                collapseLabel={V2_INFO_SHEETS.dump.closeAria}
                controlsId="v2-dump-info-sheet"
              />
            </div>
          </div>

          <div className="v2-dump__mid">
            <h1 className="v2-dump__title">
              {t("v2.dumpTitleBefore")}
              <b>{t("v2.dumpTitleEm")}</b>
              {t("v2.dumpTitleAfter")}
            </h1>
            <button
              type="button"
              className="v2-dump__mic"
              aria-label={recording ? t("v2.dumpMicStopAria") : t("v2.dumpMicAria")}
              aria-pressed={recording}
              disabled={captureBlocked}
              onPointerDown={onMicPointerDown}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={onMicKeyDown}
              onKeyUp={onMicKeyUp}
            >
              <MicIcon />
            </button>
            <p className="v2-dump__hold" aria-live="polite">
              {holdLabel}
            </p>
            {!typeOpen ? (
              <button
                type="button"
                className="v2-dump__typelink"
                onClick={openType}
                disabled={recording || captureBlocked}
              >
                {t("v2.dumpTypeLink")}
              </button>
            ) : null}
            <div className={`v2-dump__type${typeOpen ? " is-open" : ""}`}>
              <input
                id="v2-dump-capture"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  flushDraft();
                }}
                onBlur={() => {
                  if (!draft.trim()) setTypeOpen(false);
                }}
                placeholder={t("v2.dumpTypePlaceholder")}
                aria-label={t("v2.dumpTypeAria")}
                autoComplete="off"
                tabIndex={typeOpen ? 0 : -1}
                aria-hidden={!typeOpen}
                disabled={captureBlocked || recording}
              />
            </div>
          </div>

          <div className="v2-dump__list">
            {visibleItems.length === 0 ? (
              <p className="v2-dump__empty">{t("v2.dumpEmpty")}</p>
            ) : (
              <>
                <div className="v2-dump__lhead">
                  <span className="v2-dump__lhead-label">{t("v2.dumpListHead")}</span>
                  <button
                    type="button"
                    className="v2-dump__all"
                    onClick={() => setView("all")}
                  >
                    {t("v2.dumpAll", { n: String(visibleItems.length) })}
                  </button>
                </div>
                {previewItems.map((item, index) => (
                  <DumpItemRow
                    key={item.id}
                    item={item}
                    isNew={riseFirst && index === 0}
                    makeTaskLabel={t("v2.dumpMakeTask")}
                    deleteLabel={t("v2.dumpDelete")}
                    onTask={() => handleTask(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {toast ? (
        <div
          className="v2-dump__toast"
          role="status"
          aria-live="polite"
        >
          <span>
            {toast.kind === "undo" ? t("v2.dumpToastDeleted") : toast.text}
          </span>
          {toast.kind === "undo" ? (
            <button type="button" onClick={handleUndo} className="v2-dump__toast-btn">
              {t("v2.dumpToastUndo")}
            </button>
          ) : null}
        </div>
      ) : null}

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

function DumpItemRow({
  item,
  isNew = false,
  wrap = false,
  makeTaskLabel,
  deleteLabel,
  onTask,
  onDelete,
}: {
  item: V2DumpItem;
  isNew?: boolean;
  wrap?: boolean;
  makeTaskLabel: string;
  deleteLabel: string;
  onTask: () => void;
  onDelete: () => void;
}) {
  const voice = isV2DumpVoiceItem(item);
  const clock = formatV2DumpClock(item.createdAt);
  return (
    <div
      className={[
        "v2-dump__item",
        isNew ? "is-new" : "",
        wrap ? "v2-dump__item--wrap" : "",
        item.disposition === "rest" ? "is-rest" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="v2-dump__item-ic" aria-hidden>
        {voice ? <SmallMicIcon /> : <PenIcon />}
      </span>
      <span className="v2-dump__item-body">
        <span className="v2-dump__item-t">{item.content}</span>
        {clock ? <span className="v2-dump__item-at">{clock}</span> : null}
      </span>
      <div className="v2-dump__item-acts">
        <button
          type="button"
          className="v2-dump__icon-btn"
          aria-label={makeTaskLabel}
          data-dump-act="plus"
          onClick={onTask}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          className="v2-dump__icon-btn is-muted"
          aria-label={deleteLabel}
          data-dump-act="delete"
          onClick={onDelete}
        >
          <CrossIcon />
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="9" y="3.5" width="6" height="10" rx="3" />
      <path d="M6 11.5a6 6 0 0012 0M12 17.5V21" />
    </svg>
  );
}

function SmallMicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="3.5" width="6" height="10" rx="3" />
      <path d="M6 11.5a6 6 0 0012 0M12 17.5V21" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4.5 19.5h4l10-10-4-4-10 10v4zM14.5 5.5l4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
