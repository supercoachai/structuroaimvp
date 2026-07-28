"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { recordV2Snooze, v2AdaptiveTaskKey } from "./v2Adaptive";
import { useV2 } from "./V2Context";
import { v2NormalizeThings } from "./v2Things";
import { v2TaskEnergyToDay } from "./v2EnergyMeta";
import V2TaskBattery from "./V2TaskBattery";
import {
  compareV2TasksForList,
  emptyDraft,
  energyLabel,
  formatDeadline,
  formatRepeat,
  isOverdue,
  isV2TaskCompletedToday,
  isV2TaskVisible,
  loadV2Tasks,
  markV2TaskCompleted,
  priorityLabel,
  pruneStaleCompletedV2Tasks,
  restoreV2Task,
  saveV2Tasks,
  todayYmd,
  v2Id,
  V2_DURATION_BUCKET_OPTIONS,
  V2_ENERGY_TASK_OPTIONS,
  V2_PRIORITY_OPTIONS,
  V2_REPEAT_OPTIONS,
  V2_SNOOZE_REST,
  v2SnoozeUntilEvening,
  v2SnoozeUntilTomorrowMorning,
  type V2Task,
} from "./v2Tasks";

export default function TodoV2Client() {
  const { state, ready } = useV2();
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<V2Task | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [microDraft, setMicroDraft] = useState("");
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [infoOpen, setInfoOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const editAnchorRef = useRef<HTMLDivElement | null>(null);

  // Laad uit localStorage. Zaai bij een lege lijst de gekozen dingen van de reis.
  useEffect(() => {
    if (!ready || loaded) return;
    let initial = loadV2Tasks();
    const journeyThings = v2NormalizeThings(state.things);
    if (initial.length === 0 && journeyThings.length > 0) {
      initial = journeyThings.map((title) => {
        const seed = emptyDraft();
        seed.title = title;
        return seed;
      });
      saveV2Tasks(initial);
    }
    setTasks(initial);
    setLoaded(true);
  }, [ready, loaded, state.things]);

  // Dagwisseling terwijl de pagina open blijft: oude voltooide taken weg.
  useEffect(() => {
    if (!loaded) return;
    const pruneIfNeeded = () => {
      const today = todayYmd();
      setTasks((prev) => {
        const next = pruneStaleCompletedV2Tasks(prev, today);
        if (next.length === prev.length) return prev;
        saveV2Tasks(next);
        return next;
      });
    };
    const onVis = () => {
      if (document.visibilityState === "visible") pruneIfNeeded();
    };
    window.addEventListener("focus", pruneIfNeeded);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", pruneIfNeeded);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loaded]);

  // Inline-editor in beeld houden (geen jump naar pagina-onderkant).
  useEffect(() => {
    if (!draft || isNew) return;
    editAnchorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft?.id, isNew]);

  const persist = (next: V2Task[]) => {
    setTasks(next);
    saveV2Tasks(next);
  };

  const activeTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && isV2TaskVisible(t))
        .slice()
        .sort(compareV2TasksForList),
    [tasks],
  );
  const completedToday = useMemo(
    () =>
      tasks
        .filter((t) => isV2TaskCompletedToday(t))
        .slice()
        .sort((a, b) => (b.completedDate ?? "").localeCompare(a.completedDate ?? "") || b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  );
  const snoozedTasks = useMemo(
    () => tasks.filter((t) => !t.done && !isV2TaskVisible(t)),
    [tasks],
  );

  const completeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.done) return;
    setFadingIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? markV2TaskCompleted(t) : t,
        );
        saveV2Tasks(next);
        return next;
      });
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const restoreTask = (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? restoreV2Task(t) : t));
      saveV2Tasks(next);
      return next;
    });
  };

  const snoozeTask = (id: string, until: string | typeof V2_SNOOZE_REST) => {
    recordV2Snooze(v2AdaptiveTaskKey(id));
    persist(tasks.map((t) => (t.id === id ? { ...t, snoozeUntil: until } : t)));
  };

  const startNew = () => {
    setDraft(emptyDraft());
    setIsNew(true);
    setMicroDraft("");
  };

  const startEdit = (task: V2Task) => {
    // Eén open editor: heropenen van dezelfde rij sluit af.
    if (draft && !isNew && draft.id === task.id) {
      setDraft(null);
      setMicroDraft("");
      return;
    }
    setDraft({ ...task, microSteps: task.microSteps.map((m) => ({ ...m })) });
    setIsNew(false);
    setMicroDraft("");
  };

  const cancelEdit = () => {
    setDraft(null);
    setMicroDraft("");
  };

  const saveDraft = () => {
    if (!draft) return;
    const title = draft.title.trim();
    if (title.length === 0) return;
    const clean: V2Task = {
      ...draft,
      title,
      why: draft.why?.trim() ? draft.why.trim() : null,
      outcome: draft.outcome?.trim() ? draft.outcome.trim() : null,
    };
    const exists = tasks.some((t) => t.id === clean.id);
    persist(exists ? tasks.map((t) => (t.id === clean.id ? clean : t)) : [...tasks, clean]);
    setDraft(null);
    setMicroDraft("");
  };

  const removeTask = () => {
    if (!draft) return;
    persist(tasks.filter((t) => t.id !== draft.id));
    setDraft(null);
    setMicroDraft("");
  };

  const patchDraft = (patch: Partial<V2Task>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const addMicro = () => {
    const title = microDraft.trim();
    if (!draft || title.length === 0) return;
    patchDraft({
      microSteps: [...draft.microSteps, { id: v2Id("ms"), title, done: false }],
    });
    setMicroDraft("");
  };

  const removeMicro = (id: string) =>
    draft &&
    patchDraft({ microSteps: draft.microSteps.filter((m) => m.id !== id) });

  const suggestMicroSteps = async () => {
    if (!draft || suggestBusy) return;
    const title = draft.title.trim();
    if (title.length === 0) {
      setSuggestError("Vul eerst een titel in.");
      return;
    }
    setSuggestBusy(true);
    setSuggestError(null);
    try {
      const { fetchMicroStepSuggestions } = await import(
        "@/lib/ai/fetchMicroStepSuggestions"
      );
      const result = await fetchMicroStepSuggestions({
        title,
        energyLevel: draft.energy,
        locale: "nl",
      });
      patchDraft({
        microSteps: result.steps.slice(0, 4).map((stepTitle) => ({
          id: v2Id("ms"),
          title: stepTitle,
          done: false,
        })),
      });
    } catch {
      setSuggestError("Voorstellen lukten niet. Probeer later opnieuw.");
    } finally {
      setSuggestBusy(false);
    }
  };

  const formOpen = draft !== null;
  const editingId = formOpen && !isNew ? draft.id : null;

  const formProps = draft
    ? {
        draft,
        isNew,
        microDraft,
        suggestBusy,
        suggestError,
        onMicroDraft: setMicroDraft,
        onAddMicro: addMicro,
        onRemoveMicro: removeMicro,
        onSuggestMicro: () => void suggestMicroSteps(),
        onPatch: patchDraft,
        onSave: saveDraft,
        onCancel: cancelEdit,
        onDelete: removeTask,
      }
    : null;

  return (
    <V2AppShell>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-8 pt-6">
        <header>
          <div className="v2-info-head">
            <V2Eyebrow>Je lijst</V2Eyebrow>
            <V2InfoHint
              infoId="v2_todo"
              expanded={infoOpen}
              onToggle={() => setInfoOpen((v) => !v)}
              expandLabel={V2_INFO_SHEETS.todo.openAria}
              collapseLabel={V2_INFO_SHEETS.todo.closeAria}
              controlsId="v2-todo-info-sheet"
            />
          </div>
          <h1 className="v2-serif mt-2" style={{ fontSize: "var(--fs-display)" }}>
            Taken
          </h1>
        </header>

        {activeTasks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {activeTasks.map((task) => {
              const editing = editingId === task.id && formProps != null;
              return (
                <div key={task.id} ref={editing ? editAnchorRef : undefined}>
                  <TaskRow
                    task={task}
                    fading={fadingIds.has(task.id)}
                    editing={editing}
                    onToggle={() => completeTask(task.id)}
                    onEdit={() => startEdit(task)}
                    onSnooze={(until) => snoozeTask(task.id, until)}
                  >
                    {editing && formProps ? (
                      <TaskForm key={draft!.id} {...formProps} compact />
                    ) : null}
                  </TaskRow>
                </div>
              );
            })}
          </div>
        ) : null}

        {snoozedTasks.length > 0 ? (
          <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
            {snoozedTasks.length === 1
              ? "Eén taak rust even."
              : `${snoozedTasks.length} taken rusten even.`}
          </p>
        ) : null}

        {formOpen && isNew && formProps ? (
          <TaskForm key={draft!.id} {...formProps} />
        ) : !formOpen ? (
          <button type="button" onClick={startNew} className="btn-primary w-full">
            Nieuwe taak
          </button>
        ) : null}

        {completedToday.length > 0 ? (
          <CompletedTodaySection
            tasks={completedToday}
            open={completedOpen}
            onToggleOpen={() => setCompletedOpen((v) => !v)}
            onRestore={restoreTask}
          />
        ) : null}
      </div>

      <V2InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        eyebrow={V2_INFO_SHEETS.todo.eyebrow}
        title={V2_INFO_SHEETS.todo.title}
        rows={V2_INFO_SHEETS.todo.rows}
        gotItLabel={V2_INFO_SHEETS.todo.gotIt}
        closeAria={V2_INFO_SHEETS.todo.closeAria}
        panelId="v2-todo-info-sheet"
      />
    </V2AppShell>
  );
}

function CompletedTodaySection({
  tasks,
  open,
  onToggleOpen,
  onRestore,
}: {
  tasks: V2Task[];
  open: boolean;
  onToggleOpen: () => void;
  onRestore: (id: string) => void;
}) {
  const count = tasks.length;
  const label =
    count === 1 ? "Voltooid vandaag (1)" : `Voltooid vandaag (${count})`;

  return (
    <section style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="w-full text-left"
        style={{
          background: "none",
          border: "none",
          padding: "8px 2px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
          }}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="v2-card"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: 0.92,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: "var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5 9-9"
                    stroke="var(--text-on-ink)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                className="min-w-0 flex-1"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                  textDecorationColor: "color-mix(in srgb, var(--text-muted) 45%, transparent)",
                }}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => onRestore(task.id)}
                className="v2-link shrink-0"
                style={{ fontSize: 13, padding: "4px 2px" }}
                aria-label={`Zet ${task.title} terug op de lijst`}
              >
                Terugzetten
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TaskRow({
  task,
  fading,
  editing = false,
  onToggle,
  onEdit,
  onSnooze,
  children,
}: {
  task: V2Task;
  fading?: boolean;
  editing?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSnooze: (until: string | typeof V2_SNOOZE_REST) => void;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const deadline = formatDeadline(task.dueDate);
  const repeat = formatRepeat(task);
  const prio = priorityLabel(task.priority);
  const energy = energyLabel(task.energy);
  const overdue = isOverdue(task);
  const microDone = task.microSteps.filter((m) => m.done).length;
  const hasDetails =
    Boolean(deadline || repeat || prio || energy || task.microSteps.length > 0 || task.why || task.outcome);
  const showDetails = !editing && expanded;

  return (
    <div
      className={`v2-card ${fading ? "v2-fade-out" : ""}`}
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={false}
          aria-label="Markeer als klaar"
          style={{
            width: 24,
            height: 24,
            marginTop: 1,
            borderRadius: 999,
            flexShrink: 0,
            border: "1.5px solid var(--border)",
            background: "transparent",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (editing) return;
            setExpanded((v) => !v);
          }}
          className="min-w-0 flex-1 text-left"
          aria-expanded={editing || expanded}
          style={{ background: "none", border: "none", padding: 0, cursor: editing ? "default" : "pointer" }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <V2TaskBattery energy={v2TaskEnergyToDay(task.energy)} size={16} />
            <span className="min-w-0">{task.title}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={editing ? "Bewerken sluiten" : "Bewerken"}
          aria-pressed={editing}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            marginTop: -4,
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            opacity: editing ? 0.85 : 0.42,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {editing ? children : null}

      {showDetails ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 36 }}>
          {hasDetails ? (
            <>
              {task.why || task.outcome ? (
                <p className="text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {task.why ? task.why : null}
                  {task.why && task.outcome ? " · " : null}
                  {task.outcome ? `Levert op: ${task.outcome}` : null}
                </p>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {deadline ? (
                  <span className="v2-meta" data-overdue={overdue ? "true" : "false"}>
                    {overdue ? `${deadline} (verlopen)` : deadline}
                  </span>
                ) : null}
                {repeat ? <span className="v2-meta">{repeat}</span> : null}
                {prio ? <span className="v2-meta">{prio}</span> : null}
                {energy ? <span className="v2-meta">{energy}</span> : null}
                {task.microSteps.length > 0 ? (
                  <span className="v2-meta">
                    {microDone}/{task.microSteps.length} microstappen
                  </span>
                ) : null}
              </div>
              {task.microSteps.length > 0 ? (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {task.microSteps.map((m) => (
                    <li key={m.id} className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {m.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <SnoozeChip label="Vanavond" onClick={() => onSnooze(v2SnoozeUntilEvening())} />
            <SnoozeChip label="Morgen" onClick={() => onSnooze(v2SnoozeUntilTomorrowMorning())} />
            <SnoozeChip label="Laat rusten" onClick={() => onSnooze(V2_SNOOZE_REST)} muted />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SnoozeChip({
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
      className="v2-chip"
      style={{
        opacity: muted ? 0.85 : 1,
        fontSize: 12,
        padding: "6px 10px",
      }}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: "var(--fs-small)",
        fontWeight: 600,
        color: "var(--text)",
        margin: "0 0 8px",
      }}
    >
      {children}
    </p>
  );
}

function TaskForm({
  draft,
  isNew,
  microDraft,
  suggestBusy = false,
  suggestError = null,
  onMicroDraft,
  onAddMicro,
  onRemoveMicro,
  onSuggestMicro,
  onPatch,
  onSave,
  onCancel,
  onDelete,
  compact = false,
}: {
  draft: V2Task;
  isNew: boolean;
  microDraft: string;
  suggestBusy?: boolean;
  suggestError?: string | null;
  onMicroDraft: (v: string) => void;
  onAddMicro: () => void;
  onRemoveMicro: (id: string) => void;
  onSuggestMicro?: () => void;
  onPatch: (patch: Partial<V2Task>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  /** Inline onder een bestaande rij: iets compactere padding, geen grote titel. */
  compact?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const deadlineChoice: "none" | "today" | "tomorrow" | "custom" = !draft.dueDate
    ? "none"
    : draft.dueDate === todayYmd()
      ? "today"
      : draft.dueDate === ymdTomorrow()
        ? "tomorrow"
        : "custom";

  const canSave = draft.title.trim().length > 0;

  return (
    <section
      className={compact ? undefined : "v2-card w-full"}
      style={{
        boxSizing: "border-box",
        width: compact ? undefined : "100%",
        padding: compact ? "14px 0 0" : "24px 22px 22px",
        display: "flex",
        flexDirection: "column",
        gap: compact ? 14 : 18,
        borderTop: compact ? "1px solid var(--border)" : undefined,
        marginTop: compact ? 4 : undefined,
      }}
    >
      {!compact ? (
        <h2
          className="v2-serif"
          style={{ fontSize: "var(--fs-title)", margin: 0, padding: 0 }}
        >
          Nieuwe taak
        </h2>
      ) : null}

      <div>
        <FieldLabel>Wat wil je doen?</FieldLabel>
        <input
          type="text"
          className="v2-field"
          value={draft.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Titel van de taak"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div>
        <FieldLabel>Energie die het kost</FieldLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {V2_ENERGY_TASK_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className="v2-chip"
              aria-pressed={draft.energy === opt.value}
              onClick={() => onPatch({ energy: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!moreOpen ? (
        <button type="button" className="v2-link self-start" onClick={() => setMoreOpen(true)}>
          Meer
        </button>
      ) : (
        <>
          <div>
            <FieldLabel>Waarom? (optioneel)</FieldLabel>
            <input
              type="text"
              className="v2-field"
              value={draft.why ?? ""}
              onChange={(e) => onPatch({ why: e.target.value || null })}
              placeholder="Bijvoorbeeld: rust in mijn hoofd"
              autoComplete="off"
            />
          </div>

          <div>
            <FieldLabel>Wat levert het op? (optioneel)</FieldLabel>
            <input
              type="text"
              className="v2-field"
              value={draft.outcome ?? ""}
              onChange={(e) => onPatch({ outcome: e.target.value || null })}
              placeholder="Bijvoorbeeld: meer ruimte voor mezelf"
              autoComplete="off"
            />
          </div>

          <div>
            <FieldLabel>Deadline</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {[
                { id: "none", label: "Geen" },
                { id: "today", label: "Vandaag" },
                { id: "tomorrow", label: "Morgen" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="v2-chip"
                  aria-pressed={deadlineChoice === opt.id}
                  onClick={() =>
                    onPatch({
                      dueDate:
                        opt.id === "none"
                          ? null
                          : opt.id === "today"
                            ? todayYmd()
                            : ymdTomorrow(),
                    })
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="v2-field"
              value={draft.dueDate ?? ""}
              onChange={(e) => onPatch({ dueDate: e.target.value ? e.target.value : null })}
              aria-label="Kies een datum"
            />
          </div>

          <div>
            <FieldLabel>Herhaling</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {V2_REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="v2-chip"
                  aria-pressed={draft.repeat === opt.value}
                  onClick={() => onPatch({ repeat: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {draft.repeat === "interval" ? (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "var(--fs-small)", color: "var(--text-muted)" }}>
                  Elke
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="v2-field"
                  style={{ width: 90, minHeight: 44 }}
                  value={draft.repeatIntervalDays ?? 14}
                  onChange={(e) => {
                    const n = Math.round(Number(e.target.value));
                    onPatch({
                      repeatIntervalDays: Number.isFinite(n)
                        ? Math.max(1, Math.min(365, n))
                        : 14,
                    });
                  }}
                  aria-label="Aantal dagen tussen herhalingen"
                />
                <span style={{ fontSize: "var(--fs-small)", color: "var(--text-muted)" }}>
                  dagen
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <FieldLabel>Prioriteit</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {V2_PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  className="v2-chip"
                  aria-pressed={draft.priority === opt.value}
                  onClick={() => onPatch({ priority: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Duur (optioneel, voor focus)</FieldLabel>
            <p
              className="mb-2 text-[13px]"
              style={{ color: "var(--text-muted)", margin: "0 0 8px" }}
            >
              Kort, middel of lang. Geen minuten, alleen een zachte hint in focus.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {V2_DURATION_BUCKET_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  className="v2-chip"
                  aria-pressed={draft.durationBucket === opt.value}
                  onClick={() => onPatch({ durationBucket: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Microstappen</FieldLabel>
            <p
              className="mb-2 text-[13px]"
              style={{ color: "var(--text-muted)", margin: "0 0 8px" }}
            >
              Kleine stukjes maken een taak lichter. Alleen toevoegen als het helpt.
            </p>
            {draft.microSteps.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {draft.microSteps.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 14, color: "var(--text)" }}>{m.title}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveMicro(m.id)}
                      className="v2-link"
                      style={{ padding: "2px 6px" }}
                      aria-label={`Verwijder microstap ${m.title}`}
                    >
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
            ) : onSuggestMicro ? (
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={onSuggestMicro}
                  disabled={suggestBusy || draft.title.trim().length === 0}
                  className="btn-ghost w-full"
                >
                  {suggestBusy
                    ? "Bezig met nadenken..."
                    : "Opsplitsen in stappen?"}
                </button>
                {suggestError ? (
                  <p
                    className="mt-2 text-[12px]"
                    style={{ color: "var(--text-muted)", margin: "8px 0 0" }}
                  >
                    {suggestError}
                  </p>
                ) : (
                  <p
                    className="mt-2 text-[12px]"
                    style={{ color: "var(--text-muted)", margin: "8px 0 0" }}
                  >
                    Structuro stelt vier kleine stappen voor. Jij beslist.
                  </p>
                )}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="v2-field"
                style={{ minHeight: 48 }}
                value={microDraft}
                onChange={(e) => onMicroDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddMicro();
                  }
                }}
                placeholder="Kleine tussenstap toevoegen"
                autoComplete="off"
              />
              <button type="button" onClick={onAddMicro} className="btn-ghost shrink-0">
                Toevoegen
              </button>
            </div>
          </div>

          <button type="button" className="v2-link self-start" onClick={() => setMoreOpen(false)}>
            Minder
          </button>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={onSave}
          className="btn-primary w-full"
          disabled={!canSave}
        >
          {isNew ? "Toevoegen" : "Opslaan"}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={onCancel} className="v2-link">
            Annuleren
          </button>
          {!isNew ? (
            <button type="button" onClick={onDelete} className="v2-link">
              Verwijderen
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ymdTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayYmd(d);
}
