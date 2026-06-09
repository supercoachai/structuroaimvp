"use client";

import { useState } from "react";
import { calendarDayDiff, parseDueCalendarDayAmsterdam } from "@/lib/dagstart/deadlineToday";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { getTaskDurationMinutes } from "@/lib/taskDurationMinutes";
import { normalizeMicroSteps, type MicroStep } from "@/lib/microSteps";
import { formatRepeatLabel } from "@/lib/taskRecurrence";
import { useI18n } from "@/lib/i18n";
import MicroStepsEditor from "@/components/tasks/MicroStepsEditor";
import "./open-tasks-list-c.css";

const GROUPS = [
  { key: "green" as const, color: "#10B981" },
  { key: "yellow" as const, color: "#3B6BF7" },
  { key: "red" as const, color: "#8B5CF6" },
];

type TaskRow = {
  id: string;
  title: string;
  dueAt?: string | null;
  isDeadline?: boolean | null;
  repeat?: string | null;
  repeatNextDueAt?: string | null;
  duration?: number | null;
  estimatedDuration?: number | null;
  microSteps?: unknown;
};

type OpenByEnergy = Record<(typeof GROUPS)[number]["key"], TaskRow[]>;

type OpenTasksListCProps = {
  loading: boolean;
  openByEnergy: OpenByEnergy;
  completingTaskIds: Set<string>;
  onStart: (task: TaskRow) => void;
  onEdit: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
  onToggle: (task: TaskRow) => void;
  onUpdateMicroSteps: (task: TaskRow, steps: MicroStep[]) => void | Promise<void>;
};

function deadlineColor(overdue: boolean, urgent: boolean): string {
  if (overdue || urgent) return "#EF4444";
  return "var(--st-muted)";
}

function getListDeadlineMeta(
  dueAt: string | null | undefined,
  locale: "nl" | "en"
): { label: string; overdue: boolean; urgent: boolean } | null {
  const dueDay = parseDueCalendarDayAmsterdam(dueAt);
  if (!dueDay) return null;

  const today = getCalendarDateAmsterdam();
  const diff = calendarDayDiff(today, dueDay);
  const [y, m, d] = dueDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const label = date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return {
    label,
    overdue: diff < 0,
    urgent: diff >= 0 && diff <= 1,
  };
}

function ListIcons({
  kind,
  color = "currentColor",
  size = 15,
}: {
  kind: "play" | "edit" | "trash" | "chev" | "caret" | "info";
  color?: string;
  size?: number;
}) {
  if (kind === "play") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M5 3.5l7 4.5-7 4.5v-9z"
          fill={color}
          stroke={color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "edit") {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M11.5 3.5l3 3M3 15l1-3.5L12.5 3a1.4 1.4 0 012 0l.5.5a1.4 1.4 0 010 2L6.5 14 3 15z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "trash") {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M3.5 5h11M7 5V3.5h4V5M5 5l.7 9.5a1 1 0 001 .9h4.6a1 1 0 001-.9L13 5M8 8v5M10 8v5"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "chev") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M5 3l5 5-5 5"
          stroke={color}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "caret") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M4 6l4 4 4-4"
          stroke={color}
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.4" />
      <path d="M9 8v4M9 6h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TaskCheck({
  color,
  done,
  alive,
  onClick,
  label,
}: {
  color: string;
  done: boolean;
  alive?: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`lc-check${done ? " done" : ""}${alive ? " alive" : ""}`}
      style={{ "--lc-check-color": color } as React.CSSProperties}
      onClick={onClick}
      aria-label={label}
    >
      {done ? (
        <svg width={10} height={10} viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2 6l3 3 5-6"
            stroke="#fff"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

export default function OpenTasksListC({
  loading,
  openByEnergy,
  completingTaskIds,
  onStart,
  onEdit,
  onDelete,
  onToggle,
  onUpdateMicroSteps,
}: OpenTasksListCProps) {
  const { t: tr, locale } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [microEditTaskId, setMicroEditTaskId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    green: false,
    yellow: false,
    red: false,
  });
  const [infoOpen, setInfoOpen] = useState(false);

  const groupLabels: Record<(typeof GROUPS)[number]["key"], string> = {
    green: tr("tasks.colEasy"),
    yellow: tr("tasks.colNormal"),
    red: tr("tasks.colIntense"),
  };

  const totalOpen =
    openByEnergy.green.length + openByEnergy.yellow.length + openByEnergy.red.length;

  return (
    <section id="alle-open-taken" className="open-tasks-list-c overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="lc-list-head">
        <h2>{tr("tasks.sectionOpen")}</h2>
        <button
          type="button"
          className="lc-info-dot"
          onClick={() => setInfoOpen(true)}
          title={tr("tasks.repeatInfoTitle")}
          aria-label={tr("tasks.repeatInfoTitle")}
        >
          <ListIcons kind="info" color="var(--st-muted)" size={13} />
        </button>
      </div>

      <div className="lc-scroll">
        {loading ? (
          <p className="lc-empty">{tr("tasks.loadingOpen")}</p>
        ) : totalOpen === 0 ? (
          <p className="lc-empty">{tr("tasks.noOpen")}</p>
        ) : (
          GROUPS.map((group) => {
            const list = openByEnergy[group.key];
            const zoneOpen = openGroups[group.key];
            return (
              <div key={group.key} className={`lc-group${zoneOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className="lc-ghead"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                  }
                  aria-expanded={zoneOpen}
                >
                  <span className="lc-dot" style={{ background: group.color }} />
                  <span className="lc-gname">{groupLabels[group.key]}</span>
                  <span className="lc-gcount">{list.length}</span>
                  <span className="lc-line" />
                  <span
                    className="lc-gcaret"
                    style={{ transform: zoneOpen ? "rotate(180deg)" : "none" }}
                  >
                    <ListIcons kind="caret" color="var(--st-muted-2)" size={15} />
                  </span>
                </button>

                {zoneOpen ? (
                  <div className="lc-rows">
                    {list.map((task) => {
                      const active = selectedId === task.id;
                      const isCompleting = completingTaskIds.has(task.id);
                      const mins = getTaskDurationMinutes(task);
                      const legacyOneOffDeadline =
                        task.isDeadline == null &&
                        Boolean(task.dueAt) &&
                        (!task.repeat || task.repeat === "none");
                      const showsDeadline = task.isDeadline || legacyOneOffDeadline;
                      const deadlineMeta = showsDeadline
                        ? getListDeadlineMeta(task.dueAt, locale)
                        : task.repeat === "interval" && task.repeatNextDueAt
                          ? getListDeadlineMeta(task.repeatNextDueAt, locale)
                          : null;
                      const microSteps = normalizeMicroSteps(task.microSteps);
                      const microCount = microSteps.length;
                      const microDoneCount = microSteps.filter((s) => s.done).length;
                      const repeatLabel = formatRepeatLabel(task, tr, "taskEditor");
                      const stepsLabel =
                        microDoneCount > 0
                          ? tr("tasks.microStepsBadge", {
                              done: String(microDoneCount),
                              total: String(microCount),
                            })
                          : locale === "en"
                            ? `${microCount} steps`
                            : `${microCount} stappen`;

                      return (
                        <div
                          key={task.id}
                          className={`lc-row-wrap${active ? " active" : ""}${isCompleting ? " is-done" : ""}`}
                        >
                          <div
                            className={`lc-row${active ? " active" : ""}`}
                            onClick={() => {
                              setSelectedId((id) => {
                                const next = id === task.id ? null : task.id;
                                if (next === task.id && microCount > 0) {
                                  setMicroEditTaskId(task.id);
                                } else if (next !== task.id) {
                                  setMicroEditTaskId(null);
                                }
                                return next;
                              });
                            }}
                          >
                            <TaskCheck
                              color={group.color}
                              done={isCompleting}
                              alive={active && !isCompleting}
                              label={tr("tasks.quickDoneTitle")}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggle(task);
                              }}
                            />
                            <div className="lc-main">
                              <span className="lc-title">{task.title}</span>
                              {(deadlineMeta || repeatLabel || microCount > 0) && (
                                <span className="lc-sub">
                                  {deadlineMeta ? (
                                    <span
                                      style={{
                                        color: deadlineColor(
                                          deadlineMeta.overdue,
                                          deadlineMeta.urgent
                                        ),
                                        fontWeight: 600,
                                      }}
                                    >
                                      {deadlineMeta.label}
                                    </span>
                                  ) : null}
                                  {deadlineMeta && (repeatLabel || microCount > 0) ? (
                                    <span className="lc-dotsep">·</span>
                                  ) : null}
                                  {repeatLabel ? <span>{repeatLabel}</span> : null}
                                  {repeatLabel && microCount > 0 ? (
                                    <span className="lc-dotsep">·</span>
                                  ) : null}
                                  {microCount > 0 ? (
                                    <button
                                      type="button"
                                      className={`lc-micro-trigger${microDoneCount > 0 ? " lc-micro-trigger--progress" : ""}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(task.id);
                                        setMicroEditTaskId(task.id);
                                      }}
                                    >
                                      {stepsLabel}
                                    </button>
                                  ) : null}
                                </span>
                              )}
                            </div>
                            {mins ? <span className="lc-min">{mins}m</span> : null}
                            {active ? (
                              <div
                                className="lc-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="lc-act start"
                                  style={{ "--lc-act-color": group.color } as React.CSSProperties}
                                  aria-label={tr("tasks.playFocus")}
                                  onClick={() => onStart(task)}
                                >
                                  <ListIcons kind="play" color="#fff" size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="lc-act"
                                  aria-label={tr("tasks.edit")}
                                  onClick={() => onEdit(task)}
                                >
                                  <ListIcons kind="edit" color="var(--st-muted)" size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="lc-act"
                                  aria-label={tr("tasks.deleteTitle")}
                                  onClick={() => onDelete(task)}
                                >
                                  <ListIcons kind="trash" color="var(--st-muted)" size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="lc-chev">
                                <ListIcons kind="chev" color="var(--st-muted-2)" size={14} />
                              </span>
                            )}
                          </div>

                          {active && microCount > 0 && microEditTaskId === task.id ? (
                            <div
                              className="lc-micro-panel"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MicroStepsEditor
                                steps={microSteps}
                                onChange={(steps) => onUpdateMicroSteps(task, steps)}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {infoOpen ? (
        <div className="lc-modal-overlay" onClick={() => setInfoOpen(false)}>
          <div className="lc-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="repeat-info-title">
            <div className="lc-modal-header">
              <h3 id="repeat-info-title">{tr("tasks.repeatInfoTitle")}</h3>
            </div>
            <div className="lc-modal-body">
              <div className="lc-modal-item">
                <h4>{tr("tasks.repeatInfoOptionsTitle")}</h4>
                <p>{tr("tasks.repeatInfoOptionsBody")}</p>
              </div>
              <div className="lc-modal-item">
                <h4>{tr("tasks.repeatInfoDayTitle")}</h4>
                <p>{tr("tasks.repeatInfoDayBody")}</p>
              </div>
              <div className="lc-modal-item">
                <h4>{tr("tasks.repeatInfoEnergyTitle")}</h4>
                <p>{tr("tasks.repeatInfoEnergyBody")}</p>
              </div>
              <div className="lc-modal-item">
                <h4>{tr("tasks.repeatInfoShiftTitle")}</h4>
                <p>{tr("tasks.repeatInfoShiftBody")}</p>
              </div>
              <div className="lc-modal-item">
                <h4>{tr("tasks.repeatInfoBiweeklyTitle")}</h4>
                <p>{tr("tasks.repeatInfoBiweeklyBody")}</p>
              </div>
            </div>
            <div className="lc-modal-footer">
              <button type="button" className="lc-modal-close" onClick={() => setInfoOpen(false)}>
                {tr("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
