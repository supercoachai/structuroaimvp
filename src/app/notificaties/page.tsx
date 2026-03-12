"use client";

import { useMemo, useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useTaskContext, Task } from "../../context/TaskContext";
import { requestNotificationPermission, testReminder } from "../../components/ReminderEngine";
import { toast } from "../../components/Toast";
import { xpForTask } from "../../lib/xp";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  BellAlertIcon,
  PlayIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

const now = () => new Date();

// Taken die in focus zijn gestart maar nog niet afgerond
function getStartedNotCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(
    (t) =>
      t.started &&
      !t.done &&
      t.source !== "medication" &&
      t.source !== "parked_thought"
  );
}

// Komende afspraken (events) die nog niet zijn begonnen
function getUpcomingAgendaItems(tasks: Task[]): Task[] {
  const from = now();
  return tasks
    .filter((t) => {
      if (t.source !== "event" || !t.dueAt) return false;
      if (t.done) return false;
      const d = new Date(t.dueAt);
      return d >= from;
    })
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
}

function formatAgendaTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAgendaDate(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const t = now();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  if (diff > 1 && diff <= 7) {
    return d.toLocaleDateString("nl-NL", { weekday: "long" });
  }
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function HerinneringenPage() {
  const router = useRouter();
  const { tasks, loading, updateTask, fetchTasks } = useTaskContext();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const startedNotCompleted = useMemo(
    () => getStartedNotCompletedTasks(tasks),
    [tasks]
  );
  const upcomingAgenda = useMemo(() => getUpcomingAgendaItems(tasks), [tasks]);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleCompleteTask = async (task: Task) => {
    if (completingId) return;
    setCompletingId(task.id);
    try {
      const xp = xpForTask(task);
      await updateTask(task.id, {
        done: true,
        completedAt: new Date().toISOString(),
        started: false,
      });
      await fetchTasks();
      toast(`Taak voltooid! +${xp} XP`, { durationMs: 3000 });
    } catch {
      toast("Kon taak niet voltooien");
    } finally {
      setCompletingId(null);
    }
  };

  const handleEnableNotifications = async () => {
    const ok = window.confirm(
      "Wil je herinneringen ontvangen voor taken en afspraken? Je kunt dit later wijzigen in je browser."
    );
    if (!ok) return;
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast("Notificaties ingeschakeld");
        testReminder();
      }
    }
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 pb-16"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <main
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* Header – zweeft los, pt-12/mb-12 voor luchtigheid */}
          <header className="text-center pt-12 pb-0 mb-12">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                boxShadow: "0 4px 14px rgba(59, 130, 246, 0.35)",
              }}
            >
              <BellAlertIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Herinneringen
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Taken afmaken en komende afspraken
            </p>
          </header>

          {/* Sectie: Taken nog afmaken */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircleIcon style={{ width: 18, height: 18 }} />
              Nog afmaken
            </h2>
            {loading ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              >
                Laden…
              </div>
            ) : startedNotCompleted.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 24,
                  padding: 28,
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#f0fdf4",
                    margin: "0 auto 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircleSolid
                    style={{ width: 28, height: 28, color: "#22c55e" }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  Geen openstaande focus-taken
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  Taken die je in focus modus start, verschijnen hier tot je ze
                  afrondt.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {startedNotCompleted.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: "#fff",
                      borderRadius: 20,
                      padding: "18px 20px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <PlayIcon
                        style={{ width: 22, height: 22, color: "#3b82f6" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#0f172a",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.title}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginTop: 2,
                          marginBottom: 0,
                        }}
                      >
                        Gestart in focus · +{xpForTask(task)} XP bij afronden
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/focus?task=${task.id}`)
                        }
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "#fff",
                          color: "#475569",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        Verder
                        <ChevronRightIcon
                          style={{ width: 16, height: 16 }}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(task)}
                        disabled={completingId === task.id}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: "none",
                          background:
                            completingId === task.id
                              ? "#94a3b8"
                              : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor:
                            completingId === task.id
                              ? "not-allowed"
                              : "pointer",
                          boxShadow:
                            completingId === task.id
                              ? "none"
                              : "0 2px 8px rgba(34, 197, 94, 0.35)",
                        }}
                      >
                        {completingId === task.id ? "Bezig…" : "Afgerond"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sectie: Komende afspraken */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CalendarDaysIcon style={{ width: 18, height: 18 }} />
              Komende afspraken
            </h2>
            {loading ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              >
                Laden…
              </div>
            ) : upcomingAgenda.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 24,
                  padding: 28,
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#fef3c7",
                    margin: "0 auto 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarDaysIcon
                    style={{ width: 26, height: 26, color: "#d97706" }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  Geen komende afspraken
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    marginTop: 4,
                    marginBottom: 0,
                  }}
                >
                  Voeg afspraken toe in Agenda & Planning.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/agenda")}
                  style={{
                    marginTop: 14,
                    padding: "10px 18px",
                    borderRadius: 12,
                    background: "#fff",
                    color: "#3b82f6",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Naar agenda
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcomingAgenda.slice(0, 10).map((task) => {
                  const date = new Date(task.dueAt!);
                  return (
                    <div
                      key={task.id}
                    style={{
                      background: "#fff",
                      borderRadius: 20,
                      padding: "16px 20px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          flexShrink: 0,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {formatAgendaDate(date)}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#0f172a",
                            marginTop: 2,
                          }}
                        >
                          {formatAgendaTime(date)}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 4,
                          height: 40,
                          borderRadius: 2,
                          background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#0f172a",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.title}
                        </p>
                        {task.duration != null && task.duration > 0 && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                              marginBottom: 0,
                            }}
                          >
                            {task.duration} min
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/agenda")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "#f8fafc",
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Agenda
                        <ChevronRightIcon
                          style={{ width: 14, height: 14 }}
                        />
                      </button>
                    </div>
                  );
                })}
                {upcomingAgenda.length > 10 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    +{upcomingAgenda.length - 10} meer in Agenda
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Instellingen */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ClockIcon style={{ width: 18, height: 18 }} />
              Notificaties
            </h2>
            <div
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Browserherinneringen
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginTop: 2,
                      marginBottom: 0,
                    }}
                  >
                    Meldingen voor taken en afspraken
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {notificationPermission === "granted" && (
                    <button
                      type="button"
                      onClick={() => testReminder()}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        background: "#f8fafc",
                        color: "#475569",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Test
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={notificationPermission !== "default"}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 10,
                      border: "none",
                      background:
                        notificationPermission === "granted"
                          ? "#22c55e"
                          : notificationPermission === "denied"
                            ? "#94a3b8"
                            : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor:
                        notificationPermission !== "default"
                          ? "default"
                          : "pointer",
                      boxShadow:
                        notificationPermission === "default"
                          ? "0 2px 8px rgba(59, 130, 246, 0.3)"
                          : "none",
                    }}
                  >
                    {notificationPermission === "granted"
                      ? "Aan"
                      : notificationPermission === "denied"
                        ? "Uit"
                        : "Inschakelen"}
                  </button>
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Stille uren
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginTop: 2,
                      marginBottom: 0,
                    }}
                  >
                    Geen meldingen 22:00 - 07:00
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 999,
                    border: "none",
                    background: quietHoursEnabled ? "#3b82f6" : "#cbd5e1",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: quietHoursEnabled ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
