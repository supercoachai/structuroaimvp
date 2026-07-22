"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { V2AppShell } from "./V2Chrome";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { recordV2Snooze, v2AdaptiveDumpKey } from "./v2Adaptive";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { isV2MutedToday } from "./v2Settings";
import { createV2SpeechSession, isV2SpeechAvailable } from "./v2Voice";
import { useV2, type V2Energy } from "./V2Context";
import { useV2Go } from "./v2nav";
import { v2MaxSlotsForEnergy, v2NormalizeThings } from "./v2Things";
import {
  addV2DumpItem,
  clearV2DumpDraft,
  importV2DumpItems,
  isV2DumpAged,
  isV2EveningLocal,
  loadV2Dump,
  loadV2DumpDraft,
  markV2DumpTriaged,
  removeV2DumpItem,
  saveV2Dump,
  saveV2DumpDraft,
  updateV2DumpItem,
  v2DumpAtMax,
  v2DumpEnergySuggestions,
  v2DumpSoftWarn,
  v2DumpTriageCandidates,
  type V2DumpItem,
} from "./v2Dump";
import { trackV2EveningDumpAdded } from "./v2Analytics";
import { emptyDraft, loadV2Tasks, saveV2Tasks, v2Id } from "./v2Tasks";

type Toast =
  | { kind: "added"; text: string }
  | { kind: "today"; text: string }
  | { kind: "task"; text: string }
  | { kind: "rest"; text: string }
  | { kind: "import"; text: string }
  | { kind: "triage"; text: string }
  | { kind: "undo"; item: V2DumpItem };

type SoftPrompt =
  | { kind: "focus"; content: string }
  | { kind: "split"; taskId: string; title: string };

type TriageSession = {
  items: V2DumpItem[];
  questions: Record<string, string>;
};

const UNDO_MS = 5000;
const AUTOSAVE_MS = 300;

function v2EnergyToMicro(energy: V2Energy | null): "low" | "medium" | "high" | null {
  if (energy === "low") return "low";
  if (energy === "high") return "high";
  if (energy === "enough") return "medium";
  return null;
}

export default function DumpV2Client() {
  const go = useV2Go();
  const { state, update } = useV2();
  const searchParams = useSearchParams();
  const captureOnMount = searchParams.get("capture") === "1";

  const [items, setItems] = useState<V2DumpItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [savedHint, setSavedHint] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [softPrompt, setSoftPrompt] = useState<SoftPrompt | null>(null);
  const [splitBusy, setSplitBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [triageSession, setTriageSession] = useState<TriageSession | null>(null);
  const [triageBusy, setTriageBusy] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [voiceFallbackText, setVoiceFallbackText] = useState("");
  const speechRef = useRef<ReturnType<typeof createV2SpeechSession> | null>(null);
  const mutedToday = isV2MutedToday();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);

  const persist = useCallback((next: V2DumpItem[]) => {
    setItems(next);
    saveV2Dump(next);
  }, []);

  useEffect(() => {
    if (loaded) return;
    persist(loadV2Dump());
    setDraft(loadV2DumpDraft());
    setLoaded(true);
  }, [loaded, persist]);

  useEffect(() => {
    if (!loaded || !captureOnMount) return;
    inputRef.current?.focus();
  }, [loaded, captureOnMount]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
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

  const flushDraft = useCallback(
    (source: "debounce" | "blur" | "enter" = "debounce") => {
      if (flushingRef.current) return;
      const trimmed = draft.trim();
      if (trimmed.length === 0) return;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (v2DumpAtMax(items)) {
        if (source !== "debounce") {
          showToast({
            kind: "added",
            text: "De lijst is vol. Kies eerst iets om ruimte te maken.",
          });
        }
        return;
      }
      flushingRef.current = true;
      const next = addV2DumpItem(trimmed, items);
      persist(next);
      if (isV2EveningLocal()) {
        trackV2EveningDumpAdded({ source: "dump", contentLength: trimmed.length });
      }
      setDraft("");
      clearV2DumpDraft();
      showSavedHint();
      showToast({ kind: "added", text: "Gedachte vastgelegd." });
      if (source === "enter") inputRef.current?.focus();
      flushingRef.current = false;
    },
    [draft, items, persist, showSavedHint, showToast],
  );

  useEffect(() => {
    if (!loaded) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    autosaveTimerRef.current = setTimeout(() => flushDraft("debounce"), AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draft, flushDraft, loaded]);

  const createTaskFromDump = useCallback(
    (item: V2DumpItem, nextItems: V2DumpItem[]) => {
      const tasks = loadV2Tasks();
      const seed = emptyDraft();
      seed.title = item.content;
      saveV2Tasks([...tasks, seed]);
      persist(nextItems);
      if (!mutedToday) {
        setSoftPrompt({ kind: "split", taskId: seed.id, title: item.content });
      }
      showToast({ kind: "task", text: "Wordt een taak op je lijst." });
    },
    [mutedToday, persist, showToast],
  );

  const handleTodaySuccess = useCallback(
    (content: string) => {
      if (mutedToday) return;
      setSoftPrompt({ kind: "focus", content });
      showToast({ kind: "today", text: "Toegevoegd aan vandaag." });
    },
    [mutedToday, showToast],
  );

  const handleToday = (item: V2DumpItem) => {
    const things = v2NormalizeThings(state.things);
    const maxSlots = v2MaxSlotsForEnergy(state.energy);
    if (things.includes(item.content)) {
      persist(updateV2DumpItem(item.id, { disposition: "today" }, items));
      showToast({ kind: "today", text: "Staat al bij je dingen van vandaag." });
      return;
    }
    if (things.length >= maxSlots) {
      showToast({
        kind: "today",
        text: `Vandaag is vol (${maxSlots} ${maxSlots === 1 ? "plek" : "plekken"}). Kies eerst iets anders.`,
      });
      return;
    }
    update({ things: [...things, item.content] });
    persist(updateV2DumpItem(item.id, { disposition: "today" }, items));
    handleTodaySuccess(item.content);
  };

  const handleTask = (item: V2DumpItem) => {
    createTaskFromDump(item, removeV2DumpItem(item.id, items));
  };

  const handleRest = (item: V2DumpItem) => {
    recordV2Snooze(v2AdaptiveDumpKey(item.id));
    persist(updateV2DumpItem(item.id, { disposition: "rest" }, items));
    showToast({ kind: "rest", text: "Mag even rusten." });
  };

  const handleWake = (item: V2DumpItem) => {
    persist(updateV2DumpItem(item.id, { disposition: null }, items));
    showToast({ kind: "rest", text: "Weer zichtbaar op de lijst." });
  };

  const handleDelete = (item: V2DumpItem) => {
    persist(removeV2DumpItem(item.id, items));
    setTriageSession((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((i) => i.id !== item.id),
          }
        : null,
    );
    showToast({ kind: "undo", item });
  };

  const handleGoogleRefresh = async () => {
    if (importBusy) return;
    setImportBusy(true);
    setImportNote(null);
    try {
      const res = await fetch("/api/v2/import/google?demo=1");
      const data = (await res.json()) as {
        ok?: boolean;
        tasks?: { title: string }[];
        label?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.tasks)) {
        showToast({ kind: "import", text: "Demotaken laden lukte niet. Probeer later opnieuw." });
        return;
      }
      const titles = data.tasks.map((t) => t.title).filter(Boolean);
      const result = importV2DumpItems(titles, items, "google-demo");
      persist(result.items);
      setImportNote(data.label ?? "Demotaken (test)");
      if (result.added === 0) {
        showToast({
          kind: "import",
          text:
            result.skipped > 0
              ? "Deze demotaken staan al op de lijst."
              : "Geen ruimte meer op de lijst.",
        });
        return;
      }
      showToast({
        kind: "import",
        text:
          result.added === 1
            ? "Eén demotaak toegevoegd aan de dumplijst."
            : `${result.added} demotaken toegevoegd aan de dumplijst.`,
      });
    } catch {
      showToast({ kind: "import", text: "Demotaken laden lukte niet. Probeer later opnieuw." });
    } finally {
      setImportBusy(false);
    }
  };

  const finishTriageItem = (id: string, nextItems: V2DumpItem[]) => {
    persist(markV2DumpTriaged(id, nextItems));
    setTriageSession((prev) => {
      if (!prev) return null;
      const remaining = prev.items.filter((i) => i.id !== id);
      if (remaining.length === 0) return null;
      const questions = { ...prev.questions };
      delete questions[id];
      return { items: remaining, questions };
    });
  };

  const handleTriageToday = (item: V2DumpItem) => {
    const things = v2NormalizeThings(state.things);
    const maxSlots = v2MaxSlotsForEnergy(state.energy);
    if (things.includes(item.content)) {
      finishTriageItem(item.id, updateV2DumpItem(item.id, { disposition: "today" }, items));
      showToast({ kind: "today", text: "Staat al bij je dingen van vandaag." });
      return;
    }
    if (things.length >= maxSlots) {
      showToast({
        kind: "today",
        text: `Vandaag is vol (${maxSlots} ${maxSlots === 1 ? "plek" : "plekken"}). Kies eerst iets anders.`,
      });
      return;
    }
    update({ things: [...things, item.content] });
    finishTriageItem(item.id, updateV2DumpItem(item.id, { disposition: "today" }, items));
    handleTodaySuccess(item.content);
  };

  const handleTriageTask = (item: V2DumpItem) => {
    const nextItems = removeV2DumpItem(item.id, items);
    createTaskFromDump(item, nextItems);
    setTriageSession((prev) => {
      if (!prev) return null;
      const remaining = prev.items.filter((i) => i.id !== item.id);
      if (remaining.length === 0) return null;
      const questions = { ...prev.questions };
      delete questions[item.id];
      return { items: remaining, questions };
    });
  };

  const handleTriageRest = (item: V2DumpItem) => {
    recordV2Snooze(v2AdaptiveDumpKey(item.id));
    finishTriageItem(item.id, updateV2DumpItem(item.id, { disposition: "rest" }, items));
    showToast({ kind: "rest", text: "Mag even rusten." });
  };

  const handleTriageDelete = (item: V2DumpItem) => {
    finishTriageItem(item.id, removeV2DumpItem(item.id, items));
    showToast({ kind: "undo", item });
  };

  const handleRustigBekijken = async () => {
    if (triageBusy) return;
    const candidates = v2DumpTriageCandidates(items);
    if (candidates.length === 0) {
      showToast({ kind: "triage", text: "Niets te bekijken nu. Alles mag rusten." });
      return;
    }

    setTriageBusy(true);
    try {
      const payload = {
        items: candidates.map((item) => ({
          id: item.id,
          content: item.content,
          ageHint: isV2DumpAged(item),
        })),
      };
      const res = await fetch("/api/v2/ai/triage-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        results?: { id: string; question: string }[];
        error?: string;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.results)) {
        showToast({
          kind: "triage",
          text:
            data.error === "rate_limited"
              ? "Even pauze. Probeer later opnieuw."
              : "Rustig bekijken lukte niet. Probeer later opnieuw.",
        });
        return;
      }
      const questions = Object.fromEntries(
        data.results.map((r) => [r.id, r.question.trim()]).filter(([, q]) => q.length > 0),
      );
      setTriageSession({ items: candidates, questions });
    } catch {
      showToast({ kind: "triage", text: "Rustig bekijken lukte niet. Probeer later opnieuw." });
    } finally {
      setTriageBusy(false);
    }
  };

  const handleUndo = () => {
    if (!toast || toast.kind !== "undo") return;
    persist([...items, toast.item].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    setToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const dismissSoftPrompt = () => setSoftPrompt(null);

  const addVoiceDump = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (v2DumpAtMax(items)) {
        showToast({
          kind: "added",
          text: "De lijst is vol. Kies eerst iets om ruimte te maken.",
        });
        return;
      }
      persist(addV2DumpItem(trimmed, items));
      if (isV2EveningLocal()) {
        trackV2EveningDumpAdded({ source: "dump", contentLength: trimmed.length });
      }
      showToast({ kind: "added", text: "Gedachte vastgelegd." });
    },
    [items, persist, showToast],
  );

  const stopVoiceRecording = useCallback(() => {
    speechRef.current?.stop();
    speechRef.current = null;
    setVoiceRecording(false);
    setVoiceProcessing(true);
  }, []);

  const startVoiceRecording = useCallback(() => {
    if (voiceRecording || v2DumpAtMax(items)) return;
    setVoiceFallback(false);
    setVoiceFallbackText("");

    const session = createV2SpeechSession(
      (text) => {
        setVoiceProcessing(false);
        addVoiceDump(text);
      },
      (msg) => {
        setVoiceProcessing(false);
        setVoiceFallback(true);
        if (msg.length > 0) {
          showToast({ kind: "added", text: msg });
        }
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
  }, [addVoiceDump, items, showToast, voiceRecording]);

  useEffect(() => {
    return () => {
      speechRef.current?.stop();
    };
  }, []);

  const handleFocusYes = () => {
    if (!softPrompt || softPrompt.kind !== "focus") return;
    const thing = softPrompt.content;
    dismissSoftPrompt();
    go(`/v2/focus?thing=${encodeURIComponent(thing)}`);
  };

  const handleSplitYes = async () => {
    if (!softPrompt || softPrompt.kind !== "split" || splitBusy) return;
    setSplitBusy(true);
    try {
      const { fetchMicroStepSuggestions } = await import(
        "@/lib/ai/fetchMicroStepSuggestions"
      );
      const result = await fetchMicroStepSuggestions({
        title: softPrompt.title,
        energyLevel: v2EnergyToMicro(state.energy),
        locale: "nl",
      });
      const tasks = loadV2Tasks();
      const microSteps = result.steps.map((title) => ({
        id: v2Id("ms"),
        title,
        done: false,
      }));
      saveV2Tasks(
        tasks.map((t) => (t.id === softPrompt.taskId ? { ...t, microSteps } : t)),
      );
      showToast({
        kind: "task",
        text:
          result.source === "template"
            ? "Kleine stappen toegevoegd (sjabloon)."
            : "Kleine stappen toegevoegd.",
      });
    } catch {
      showToast({
        kind: "task",
        text: "Opsplitsen lukte niet. De taak staat wel op je lijst.",
      });
    } finally {
      setSplitBusy(false);
      dismissSoftPrompt();
    }
  };

  const visibleItems = items.filter((i) => i.disposition !== "today");
  const suggestions =
    state.energy !== null ? v2DumpEnergySuggestions(visibleItems, state.energy) : [];
  const suggestionIds = new Set(suggestions.map((s) => s.id));
  const softWarn = v2DumpSoftWarn(items);
  const atMax = v2DumpAtMax(items);

  const canSave = draft.trim().length > 0 && !atMax;
  const speechOk = isV2SpeechAvailable();

  return (
    <V2AppShell>
      <div className="v2-dump">
        <div className="v2-dump__hero">
          <header className="v2-dump__header">
            <div className="v2-dump__header-top">
              <p className="v2-dump__eyebrow">
                <span className="v2-eyebrow-dot--static" aria-hidden="true" />
                Extern geheugen
              </p>
              <V2InfoHint
                infoId="v2_dump_extern_geheugen"
                expanded={infoOpen}
                onToggle={() => setInfoOpen((v) => !v)}
                expandLabel={V2_INFO_SHEETS.dump.openAria}
                collapseLabel={V2_INFO_SHEETS.dump.closeAria}
                controlsId="v2-dump-info-sheet"
              />
            </div>
            <h1 className="v2-dump__title">Dump</h1>
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
              onBlur={() => flushDraft("blur")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                  flushDraft("enter");
                }
              }}
              placeholder="Wat zit er in je hoofd?"
              className="v2-dump__field"
              disabled={atMax}
              autoComplete="off"
              rows={4}
            />
            <div className="v2-dump__meta">
              {savedHint ? (
                <p className="v2-dump__hint v2-dump__hint--saved" aria-live="polite">
                  Bewaard
                </p>
              ) : (
                <p className="v2-dump__hint">
                  Typ en pauzeer. Het wordt vanzelf vastgelegd.
                </p>
              )}
              {speechOk ? (
                <button
                  type="button"
                  onClick={voiceRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={atMax || voiceProcessing}
                  className="v2-dump__mic"
                  aria-label={voiceRecording ? "Stop opname" : "Spreek in"}
                  aria-pressed={voiceRecording}
                >
                  <MicIcon />
                </button>
              ) : null}
            </div>

            {voiceRecording ? (
              <div className="mt-4 flex flex-col items-center gap-3 py-2">
                <div
                  className="v2-voice-blob flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(45, 90, 86, 0.12)",
                    border: "1px solid var(--border)",
                  }}
                  aria-hidden
                />
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                  Luisteren...
                </p>
              </div>
            ) : null}

            {voiceProcessing ? (
              <p className="mt-2 text-[14px]" style={{ color: "var(--accent)" }} aria-live="polite">
                Verwerken...
              </p>
            ) : null}

            {voiceFallback ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {speechOk
                    ? "Spreek af, tik stop, typ kort wat je zei."
                    : "Spraak niet beschikbaar in deze browser. Typ kort wat je zei."}
                </p>
                <input
                  type="text"
                  value={voiceFallbackText}
                  onChange={(e) => setVoiceFallbackText(e.target.value)}
                  placeholder="Wat wilde je vastleggen?"
                  className="v2-field min-h-[44px] w-full"
                  style={{ border: "1px solid var(--border)" }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => {
                    addVoiceDump(voiceFallbackText);
                    setVoiceFallback(false);
                    setVoiceFallbackText("");
                  }}
                  className="btn-ghost w-full"
                >
                  Opslaan
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
                if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                flushDraft("enter");
              }}
            >
              Bewaren
            </button>
            <p className="v2-dump__footnote">Kies later zacht wat ermee gebeurt.</p>
          </div>
        </div>

        <div className="v2-dump__more">
          {softWarn ? (
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              {atMax
                ? "Ongeveer vol. Dat is oké. Kies iets om ruimte te maken als je wilt."
                : "De lijst wordt lang. Geen haast, maar een zachte herinnering."}
            </p>
          ) : null}

          <GoogleImportSection
            busy={importBusy}
            note={importNote}
            onRefresh={handleGoogleRefresh}
          />

          {visibleItems.length > 0 ? (
            <section className="flex flex-col gap-2">
              {!listOpen ? (
                <button
                  type="button"
                  className="v2-link self-start text-[13px]"
                  onClick={() => setListOpen(true)}
                >
                  Meer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRustigBekijken}
                    disabled={triageBusy || triageSession !== null}
                    className="btn-ghost w-full"
                  >
                    {triageBusy ? "Even kijken..." : "Rustig bekijken"}
                  </button>
                  <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                    Opt-in hulp, maximaal drie items. Jij kiest wat er gebeurt.
                  </p>
                </>
              )}
            </section>
          ) : null}

          {listOpen && triageSession && triageSession.items.length > 0 ? (
            <section
              className="rounded-[16px] p-4"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: "var(--accent)" }}
                  >
                    Rustig bekijken
                  </p>
                  <p className="mt-1 text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Geen haast. Kies per item wat past.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTriageSession(null)}
                  className="v2-link shrink-0 text-[13px]"
                >
                  Sluiten
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {triageSession.items.map((item) => (
                  <TriageRow
                    key={item.id}
                    item={item}
                    question={
                      triageSession.questions[item.id] ??
                      "Wil je dit plannen, afmaken of laten gaan?"
                    }
                    onToday={() => handleTriageToday(item)}
                    onTask={() => handleTriageTask(item)}
                    onRest={() => handleTriageRest(item)}
                    onDelete={() => handleTriageDelete(item)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {listOpen && state.energy !== null && suggestions.length > 0 && !mutedToday ? (
            <section
              className="rounded-[16px] p-4"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--accent)" }}
              >
                Past bij je energie nu
              </p>
              <ul
                className="mt-2 flex flex-col gap-2"
                style={{ margin: 0, padding: 0, listStyle: "none" }}
              >
                {suggestions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[12px] px-3 py-2 text-[15px]"
                    style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
                  >
                    {item.content}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
                Alleen een zachte suggestie. Niets hoeft nu.
              </p>
            </section>
          ) : null}

          {listOpen ? (
            visibleItems.length === 0 ? (
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
                    highlighted={suggestionIds.has(item.id)}
                    onToday={() => handleToday(item)}
                    onTask={() => handleTask(item)}
                    onRest={() => handleRest(item)}
                    onWake={() => handleWake(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )
          ) : null}
        </div>

        {softPrompt && !mutedToday ? (
          <SoftPromptCard
            prompt={softPrompt}
            splitBusy={splitBusy}
            onFocusYes={handleFocusYes}
            onSplitYes={() => void handleSplitYes()}
            onDismiss={dismissSoftPrompt}
          />
        ) : null}

        {toast ? (
          <div
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[130] flex max-w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-[14px] px-4 py-3 text-[14px] shadow-sm"
            style={{
              background: "var(--ink)",
              color: "var(--text-on-ink)",
              border: "1px solid var(--border)",
            }}
            role="status"
            aria-live="polite"
          >
            <span className="flex-1">
              {toast.kind === "undo" ? "Gedachte verwijderd." : toast.text}
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

function SoftPromptCard({
  prompt,
  splitBusy,
  onFocusYes,
  onSplitYes,
  onDismiss,
}: {
  prompt: SoftPrompt;
  splitBusy: boolean;
  onFocusYes: () => void;
  onSplitYes: () => void;
  onDismiss: () => void;
}) {
  const isFocus = prompt.kind === "focus";
  return (
    <section
      className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom))] left-1/2 z-[125] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 rounded-[16px] p-4 shadow-sm"
      style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
      role="dialog"
      aria-live="polite"
    >
      <p className="text-[15px] font-medium">
        {isFocus ? "Nu focussen?" : "Opsplitsen in kleine stappen?"}
      </p>
      {isFocus ? (
        <p className="mt-1 text-[13px] line-clamp-2" style={{ color: "var(--text-muted)" }}>
          &ldquo;{prompt.content}&rdquo; staat bij vandaag.
        </p>
      ) : (
        <p className="mt-1 text-[13px] line-clamp-2" style={{ color: "var(--text-muted)" }}>
          &ldquo;{prompt.title}&rdquo; staat op je takenlijst.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={isFocus ? onFocusYes : onSplitYes}
          disabled={!isFocus && splitBusy}
          className="btn-primary w-full"
        >
          {isFocus ? "Ja, naar focus" : splitBusy ? "Even denken..." : "Ja, opsplitsen"}
        </button>
        <button type="button" onClick={onDismiss} className="v2-link">
          {isFocus ? "Nee, blijf hier" : "Niet nu"}
        </button>
      </div>
    </section>
  );
}

function GoogleImportSection({
  busy,
  note,
  onRefresh,
}: {
  busy: boolean;
  note: string | null;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="v2-link inline-flex items-center gap-1.5 text-[13px]"
        style={{ padding: "4px 0" }}
      >
        <GoogleMark />
        {open ? "Sluiten" : "Koppel Google"}
      </button>
      {open ? (
        <div
          id={panelId}
          className="mt-2 rounded-[12px] px-3 py-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Optioneel en nog in preview. Alleen lezen, geen achtergrondsync. Mag je overslaan.
          </p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            Microsoft To Do: binnenkort.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="btn-ghost mt-3 w-full"
          >
            {busy ? "Bezig..." : "Eenmalig verversen"}
          </button>
          {note ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
              {note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function TriageRow({
  item,
  question,
  onToday,
  onTask,
  onRest,
  onDelete,
}: {
  item: V2DumpItem;
  question: string;
  onToday: () => void;
  onTask: () => void;
  onRest: () => void;
  onDelete: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <article
      className="rounded-[14px] p-3"
      style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
    >
      <p className="text-[15px] leading-snug">{item.content}</p>
      <p className="mt-2 text-[14px]" style={{ color: "var(--accent)" }}>
        {question}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SoftAction label="Naar vandaag" onClick={onToday} />
        {moreOpen ? (
          <>
            <SoftAction label="Wordt taak" onClick={onTask} />
            <SoftAction label="Laat rusten" onClick={onRest} muted />
            <SoftAction label="Weg" onClick={onDelete} muted />
          </>
        ) : (
          <button type="button" className="v2-link text-[13px]" onClick={() => setMoreOpen(true)}>
            Meer
          </button>
        )}
      </div>
    </article>
  );
}

function DumpRow({
  item,
  highlighted,
  onToday,
  onTask,
  onRest,
  onWake,
  onDelete,
}: {
  item: V2DumpItem;
  highlighted: boolean;
  onToday: () => void;
  onTask: () => void;
  onRest: () => void;
  onWake: () => void;
  onDelete: () => void;
}) {
  const aged = isV2DumpAged(item);
  const resting = item.disposition === "rest";
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <article
      className="v2-fade rounded-[16px] p-4"
      style={{
        background: resting ? "var(--surface)" : "#FFFFFF",
        border: "1px solid var(--border)",
        borderLeft: aged && !resting ? "3px solid var(--accent-soft)" : "1px solid var(--border)",
        opacity: resting ? 0.72 : 1,
      }}
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
          {highlighted && !resting ? (
            <p className="mt-1 text-[12px]" style={{ color: "var(--accent)" }}>
              Past bij je energie nu
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!resting ? (
          <>
            <SoftAction label="Naar vandaag" onClick={onToday} />
            {moreOpen ? (
              <>
                <SoftAction label="Wordt taak" onClick={onTask} />
                <SoftAction label="Laat rusten" onClick={onRest} muted />
                <SoftAction label="Weg" onClick={onDelete} muted />
              </>
            ) : (
              <button type="button" className="v2-link text-[13px]" onClick={() => setMoreOpen(true)}>
                Meer
              </button>
            )}
          </>
        ) : (
          <>
            <SoftAction label="Weer zichtbaar" onClick={onWake} />
            {moreOpen ? (
              <SoftAction label="Weg" onClick={onDelete} muted />
            ) : (
              <button type="button" className="v2-link text-[13px]" onClick={() => setMoreOpen(true)}>
                Meer
              </button>
            )}
          </>
        )}
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
