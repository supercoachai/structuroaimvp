"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import { V2LearnHintOnce } from "./V2LearnHintOnce";
import { recordV2Snooze, v2AdaptiveDumpKey, v2AdaptiveTaskKey } from "./v2Adaptive";
import { useV2 } from "./V2Context";
import { v2NormalizeThings } from "./v2Things";
import {
  emptyDraft,
  energyLabel,
  formatDeadline,
  formatRepeat,
  isOverdue,
  isV2TaskVisible,
  loadV2Tasks,
  priorityLabel,
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
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

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

  const persist = (next: V2Task[]) => {
    setTasks(next);
    saveV2Tasks(next);
  };

  const visibleTasks = useMemo(
    () => tasks.filter((t) => isV2TaskVisible(t) || t.done),
    [tasks],
  );
  const snoozedTasks = useMemo(
    () => tasks.filter((t) => !t.done && !isV2TaskVisible(t)),
    [tasks],
  );
  const openCount = useMemo(
    () => visibleTasks.filter((t) => !t.done).length,
    [visibleTasks],
  );

  const toggleDone = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!task.done) {
      setFadingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        persist(tasks.map((t) => (t.id === id ? { ...t, done: true } : t)));
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
      return;
    }
    persist(tasks.map((t) => (t.id === id ? { ...t, done: false } : t)));
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

  const formOpen = draft !== null;

  return (
    <V2AppShell>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-8 pt-6">
        <header>
          <V2Eyebrow>Je lijst</V2Eyebrow>
          <h1 className="v2-serif mt-2" style={{ fontSize: "var(--fs-display)" }}>
            Taken
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: "var(--text-muted)" }}>
            {openCount === 0
              ? "Niets open. Dat mag. Voeg iets toe als je wilt."
              : openCount === 1
                ? "Eén ding staat open. Meer hoeft niet."
                : `${openCount} dingen staan open. Pak er gerust één.`}
          </p>
          <V2LearnHintOnce feature="snooze" className="mt-2" />
        </header>

        {visibleTasks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                fading={fadingIds.has(task.id)}
                onToggle={() => toggleDone(task.id)}
                onEdit={() => startEdit(task)}
                onSnooze={(until) => snoozeTask(task.id, until)}
              />
            ))}
          </div>
        ) : null}

        {snoozedTasks.length > 0 ? (
          <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
            {snoozedTasks.length === 1
              ? "Eén taak rust even."
              : `${snoozedTasks.length} taken rusten even.`}
          </p>
        ) : null}

        {formOpen && draft ? (
          <TaskForm
            key={draft.id}
            draft={draft}
            isNew={isNew}
            microDraft={microDraft}
            onMicroDraft={setMicroDraft}
            onAddMicro={addMicro}
            onRemoveMicro={removeMicro}
            onPatch={patchDraft}
            onSave={saveDraft}
            onCancel={cancelEdit}
            onDelete={removeTask}
          />
        ) : (
          <button type="button" onClick={startNew} className="btn-primary w-full">
            Nieuwe taak
          </button>
        )}
      </div>
    </V2AppShell>
  );
}

function TaskRow({
  task,
  fading,
  onToggle,
  onEdit,
  onSnooze,
}: {
  task: V2Task;
  fading?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSnooze: (until: string | typeof V2_SNOOZE_REST) => void;
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

  return (
    <div
      className={`v2-card ${fading ? "v2-fade-out" : ""}`}
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={task.done}
          aria-label={task.done ? "Markeer als open" : "Markeer als klaar"}
          style={{
            width: 24,
            height: 24,
            marginTop: 1,
            borderRadius: 999,
            flexShrink: 0,
            border: "1.5px solid var(--border)",
            background: task.done ? "var(--accent)" : "transparent",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {task.done ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5 9-9" stroke="var(--text-on-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: task.done ? "var(--text-muted)" : "var(--text)",
            }}
          >
            {task.title}
          </span>
        </button>

        <button type="button" onClick={onEdit} className="v2-link" style={{ padding: "2px 6px" }}>
          Bewerken
        </button>
      </div>

      {expanded ? (
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
          {!task.done ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <SnoozeChip label="Vanavond" onClick={() => onSnooze(v2SnoozeUntilEvening())} />
              <SnoozeChip label="Morgen" onClick={() => onSnooze(v2SnoozeUntilTomorrowMorning())} />
              <SnoozeChip label="Laat rusten" onClick={() => onSnooze(V2_SNOOZE_REST)} muted />
            </div>
          ) : null}
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
  onMicroDraft,
  onAddMicro,
  onRemoveMicro,
  onPatch,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: V2Task;
  isNew: boolean;
  microDraft: string;
  onMicroDraft: (v: string) => void;
  onAddMicro: () => void;
  onRemoveMicro: (id: string) => void;
  onPatch: (patch: Partial<V2Task>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const hasAdvanced =
    Boolean(draft.dueDate) ||
    draft.repeat !== "none" ||
    draft.priority !== null ||
    draft.energy !== null ||
    draft.durationBucket !== null ||
    Boolean(draft.outcome?.trim()) ||
    draft.microSteps.length > 0;

  const [moreOpen, setMoreOpen] = useState(!isNew && hasAdvanced);

  const deadlineChoice: "none" | "today" | "tomorrow" | "custom" = !draft.dueDate
    ? "none"
    : draft.dueDate === todayYmd()
      ? "today"
      : draft.dueDate === ymdTomorrow()
        ? "tomorrow"
        : "custom";

  return (
    <section className="v2-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
        {isNew ? "Nieuwe taak" : "Taak bewerken"}
      </h2>

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

      {!moreOpen ? (
        <button type="button" className="v2-link self-start" onClick={() => setMoreOpen(true)}>
          Meer opties
        </button>
      ) : (
        <>
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
            Minder opties
          </button>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="button" onClick={onSave} className="btn-primary w-full">
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
