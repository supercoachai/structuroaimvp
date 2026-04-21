"use client";

import { useState, useEffect, useMemo } from "react";
import { useTaskContext } from "../context/TaskContext";
import { createClient } from "../lib/supabase/client";
import { toast } from "./Toast";
import { track } from "../shared/track";
import { triggerHaptic, HAPTIC_PATTERNS } from "@/lib/haptics";
import { insertDagafsluiterSuggestions } from "@/lib/supabase/parkedThoughtsDb";
import { useCheckIn } from "../hooks/useCheckIn";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

interface DayShutdownProps {
  onComplete: () => void;
}

export type SatisfactionLevel = "low" | "good" | "great";

export default function DayShutdown({ onComplete }: DayShutdownProps) {
  const { tasks } = useTaskContext();
  const { checkIn, loading: checkInLoading } = useCheckIn();
  const [satisfactionLevel, setSatisfactionLevel] = useState<SatisfactionLevel | null>(null);
  const [reflection, setReflection] = useState("");
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  /** Alleen focus-taken van vandaag (dagstart top 3) die nog niet af zijn, met checkbox-state. */
  const [tasksToRemember, setTasksToRemember] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const todayYmd = getCalendarDateAmsterdam();

  /** Zelfde bron als dagstart: top3_task_ids van vandaag, open, max 3. */
  const incompleteDagstartTasks = useMemo(() => {
    if (!checkIn || checkIn.date !== todayYmd || !checkIn.top3_task_ids?.length) {
      return [] as any[];
    }
    const idOrder = checkIn.top3_task_ids.map(String).slice(0, 3);
    const byId = new Map(tasks.map((t) => [String(t.id), t]));
    const out: any[] = [];
    for (const id of idOrder) {
      const t = byId.get(id);
      if (!t) continue;
      if (t.done) continue;
      if (t.source === "medication" || t.source === "event") continue;
      out.push(t);
    }
    return out;
  }, [checkIn, tasks, todayYmd]);

  useEffect(() => {
    const completed = tasks.filter(
      (t: any) =>
        t.done && t.completedAt && String(t.completedAt).slice(0, 10) === todayYmd
    );
    setCompletedTasks(completed);
  }, [tasks, todayYmd]);

  useEffect(() => {
    setTasksToRemember(incompleteDagstartTasks.map((t) => ({ ...t, selected: false })));
  }, [incompleteDagstartTasks]);

  const handleSubmit = async () => {
    if (!satisfactionLevel) {
      toast("Kies hoe voldaan je je voelt na vandaag");
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast("Je moet ingelogd zijn");
      setIsSubmitting(false);
      return;
    }

    try {
      const today = todayYmd;
      const completedIds = completedTasks.map((t) => t.id);
      const selected = tasksToRemember.filter((t) => t.selected);

      const suggestionItems = selected.map((t: any) => ({
        content: String(t.title ?? "").trim() || "Taak",
        suggestedTaskEnergy: (["low", "medium", "high"].includes(String(t.energyLevel))
          ? t.energyLevel
          : "medium") as "low" | "medium" | "high",
      }));

      if (suggestionItems.length > 0) {
        await insertDagafsluiterSuggestions(user.id, suggestionItems);
      }

      const rememberedTasksPayload =
        selected.length > 0
          ? selected.map((t: any) => ({
              id: String(t.id),
              title: String(t.title ?? "").trim() || "Taak",
            }))
          : null;

      const { error } = await supabase.from("daily_shutdowns").upsert(
        {
          user_id: user.id,
          date: today,
          completed_task_ids: completedIds,
          moved_to_tomorrow_task_ids: [],
          energy_level: null,
          satisfaction_level: satisfactionLevel,
          reflection: reflection.trim() || null,
          remembered_tasks: rememberedTasksPayload,
        },
        {
          onConflict: "user_id,date",
        }
      );

      if (error) throw error;

      triggerHaptic(HAPTIC_PATTERNS.DAY_DONE);
      toast("✨ Dagafsluiter voltooid! Goede nacht en rust goed uit.");
      track("day_shutdown", {
        satisfactionLevel,
        completedCount: completedTasks.length,
        dagafsluiterSuggestionCount: suggestionItems.length,
      });
      onComplete();
    } catch (error: unknown) {
      console.error("Dagafsluiter save error:", error);
      const msg = "Kon niet opslaan, probeer opnieuw.";
      setSaveError(msg);
      toast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskRemember = (taskId: string) => {
    setTasksToRemember((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    );
  };

  const satisfactionOptions: {
    key: SatisfactionLevel;
    emoji: string;
    label: string;
    line: string;
  }[] = [
    { key: "low", emoji: "😮‍💨", label: "Beetje", line: "Het was een dag" },
    { key: "good", emoji: "🙂", label: "Goed", line: "Ik heb gedaan wat ik kon" },
    { key: "great", emoji: "🌟", label: "Super", line: "Ik ben trots op vandaag" },
  ];

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E6E8EE",
        borderRadius: 16,
        padding: 32,
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
        🌙 Dagafsluiter
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "rgba(47,52,65,0.75)",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        Sluit je dag af met rust en overzicht
      </p>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          ✅ Wat heb je vandaag voor elkaar gekregen?
        </h3>
        {completedTasks.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: 12,
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                ✓ {task.title}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              background: "#F8FAFC",
              border: "1px dashed #E6E8EE",
              borderRadius: 8,
              textAlign: "center",
              color: "rgba(47,52,65,0.75)",
              fontSize: 14,
            }}
          >
            Geen taken voltooid vandaag. Dat is oké! Morgen is een nieuwe dag.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        {checkInLoading ? (
          <p style={{ fontSize: 14, color: "rgba(47,52,65,0.6)", textAlign: "center" }}>
            Laden…
          </p>
        ) : incompleteDagstartTasks.length === 0 ? (
          <div
            style={{
              padding: 16,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 12,
              textAlign: "center",
              fontSize: 14,
              color: "rgba(47,52,65,0.85)",
              lineHeight: 1.5,
            }}
          >
            Alles gedaan vandaag. Goed bezig. ✅
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              📅 Wil je deze morgen oppakken?
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "rgba(47,52,65,0.7)",
                marginBottom: 16,
                lineHeight: 1.45,
              }}
            >
              Jouw energie bepaalt dan wat je pakt.
            </p>
            <div style={{ display: "grid", gap: 8, maxHeight: 200, overflowY: "auto" }}>
              {tasksToRemember.map((task) => (
                <label
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    background: task.selected ? "#F0F9FF" : "#FFFFFF",
                    border: `1px solid ${task.selected ? "#BAE6FD" : "#E6E8EE"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.selected || false}
                    onChange={() => toggleTaskRemember(task.id)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ flex: 1, fontSize: 14 }}>{task.title}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          💭 Hoe voldaan ben je na vandaag?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "rgba(47,52,65,0.7)",
            marginBottom: 16,
            lineHeight: 1.45,
          }}
        >
          Niet over wat niet lukte. Over wat je hebt gedaan.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {satisfactionOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSatisfactionLevel(opt.key)}
              style={{
                flex: "1 1 90px",
                minWidth: 88,
                maxWidth: 160,
                padding: 14,
                borderRadius: 12,
                border: `2px solid ${satisfactionLevel === opt.key ? "#4A90E2" : "#E6E8EE"}`,
                background: satisfactionLevel === opt.key ? "#F0F9FF" : "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 26, lineHeight: 1 }}>{opt.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{opt.label}</div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(47,52,65,0.65)",
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {opt.line}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          💡 1 minuut reflectie (optioneel)
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Hoe voelde je dag? Wat ging goed? Wat kan beter?"
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #E6E8EE",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </div>

      {saveError ? (
        <p
          style={{
            marginBottom: 12,
            fontSize: 14,
            color: "#b91c1c",
            textAlign: "center",
            lineHeight: 1.45,
          }}
          role="alert"
        >
          {saveError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!satisfactionLevel || isSubmitting}
        style={{
          width: "100%",
          padding: 16,
          borderRadius: 12,
          border: "none",
          background: satisfactionLevel && !isSubmitting ? "#4A90E2" : "#E6E8EE",
          color: satisfactionLevel && !isSubmitting ? "white" : "rgba(47,52,65,0.5)",
          fontWeight: 600,
          fontSize: 16,
          cursor: satisfactionLevel && !isSubmitting ? "pointer" : "not-allowed",
          transition: "all 0.2s ease",
        }}
      >
        {isSubmitting ? "Opslaan..." : "Sluit mijn dag af"}
      </button>
    </div>
  );
}
