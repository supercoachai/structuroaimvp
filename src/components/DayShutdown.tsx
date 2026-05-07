"use client";

import { useState, useEffect, useMemo } from "react";
import { useTaskContext } from "../context/TaskContext";
import { createClient } from "../lib/supabase/client";
import { toast } from "./Toast";
import { track } from "../shared/track";
import { triggerHaptic, HAPTIC_PATTERNS } from "@/lib/haptics";
import { insertDagafsluiterSuggestions } from "@/lib/supabase/parkedThoughtsDb";
import { postponeTasksToCalendarDay } from "@/lib/supabase/postponeTasksDb";
import { useCheckIn } from "../hooks/useCheckIn";
import { getCalendarDateAmsterdam, getTomorrowCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { trackShutdownCompleted } from "@/utils/events";
import { useI18n } from "@/lib/i18n";
import { LENGTH_LIMITS, validateLength } from "@/lib/validateLength";

interface DayShutdownProps {
  onComplete: () => void;
}

export type SatisfactionLevel = "low" | "good" | "great";

export default function DayShutdown({ onComplete }: DayShutdownProps) {
  const { t: tr } = useI18n();
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
      toast(tr("dayShutdown.toastPickSatisfaction"));
      return;
    }

    const reflectionErr = validateLength(
      "reflection",
      reflection,
      LENGTH_LIMITS.SHUTDOWN_REFLECTION
    );
    if (reflectionErr) {
      toast(reflectionErr);
      setSaveError(reflectionErr);
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      toast(tr("dayShutdown.toastNeedLogin"));
      setIsSubmitting(false);
      return;
    }

    try {
      const today = todayYmd;
      const tomorrowYmd = getTomorrowCalendarDateAmsterdam();
      const completedIds = completedTasks.map((t) => t.id);
      const selected = tasksToRemember.filter((t) => t.selected);
      const unselected = tasksToRemember.filter((t) => !t.selected);

      // "Not today" is expliciet tijdelijk. Bij dagafsluiting verwijderen we die taken.
      const { error: removeNotTodayErr } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("not_today", true);
      if (removeNotTodayErr) {
        console.error(
          "[dagafsluiter] not_today cleanup failed:",
          removeNotTodayErr.message,
          removeNotTodayErr
        );
        throw removeNotTodayErr;
      }

      // Open, niet geselecteerde focus-taken expliciet wegzetten uit "morgen".
      if (unselected.length > 0) {
        const { error: archiveUnselectedErr } = await supabase
          .from("tasks")
          .update({ not_today: true })
          .in("id", unselected.map((t: any) => t.id))
          .eq("user_id", user.id);
        if (archiveUnselectedErr) {
          console.error(
            "[dagafsluiter] archive unselected failed:",
            archiveUnselectedErr.message,
            archiveUnselectedErr
          );
          throw archiveUnselectedErr;
        }
      }

      const suggestionItems = selected.map((t: any) => ({
        content: String(t.title ?? "").trim() || tr("common.taskFallback"),
        suggestedTaskEnergy: (["low", "medium", "high"].includes(String(t.energyLevel))
          ? t.energyLevel
          : "medium") as "low" | "medium" | "high",
        scheduledFor: tomorrowYmd,
      }));

      if (suggestionItems.length > 0) {
        try {
          await insertDagafsluiterSuggestions(user.id, suggestionItems);
        } catch (err) {
          console.error(
            "[dagafsluiter] insertDagafsluiterSuggestions failed:",
            err instanceof Error ? err.message : err,
            err
          );
          throw err;
        }
      }

      if (selected.length > 0) {
        try {
          await postponeTasksToCalendarDay(
            supabase,
            user.id,
            selected.map((t: any) => t.id),
            tomorrowYmd
          );
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
          }
        } catch (err) {
          console.error(
            "[dagafsluiter] postponeTasksToCalendarDay failed:",
            err instanceof Error ? err.message : err,
            err
          );
          throw err;
        }
      }

      const rememberedTasksPayload =
        selected.length > 0
          ? selected.map((t: any) => ({
              id: String(t.id),
              title: String(t.title ?? "").trim() || tr("common.taskFallback"),
            }))
          : null;

      const movedToTomorrowIds = selected.map((t: any) => t.id);

      const { error: shutdownErr } = await supabase.from("daily_shutdowns").upsert(
        {
          user_id: user.id,
          date: today,
          completed_task_ids: completedIds,
          moved_to_tomorrow_task_ids: movedToTomorrowIds,
          energy_level: null,
          satisfaction_level: satisfactionLevel,
          reflection: reflection.trim() || null,
          remembered_tasks: rememberedTasksPayload,
        },
        {
          onConflict: "user_id,date",
        }
      );

      if (shutdownErr) {
        console.error(
          "[dagafsluiter] daily_shutdowns upsert failed:",
          shutdownErr.message,
          shutdownErr
        );
        throw shutdownErr;
      }

      triggerHaptic(HAPTIC_PATTERNS.DAY_DONE);
      toast(tr("dayShutdown.toastDone"));
      track("day_shutdown", {
        satisfactionLevel,
        completedCount: completedTasks.length,
        dagafsluiterSuggestionCount: suggestionItems.length,
      });
      trackShutdownCompleted(
        movedToTomorrowIds.length,
        satisfactionLevel
      );
      onComplete();
    } catch (error: unknown) {
      const detail =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      console.error("Dagafsluiter save error:", detail, error);
      const msg = tr("dayShutdown.saveError");
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

  const satisfactionOptions: { key: SatisfactionLevel; emoji: string; label: string }[] = useMemo(
    () => [
      { key: "low" as const, emoji: "😮‍💨", label: tr("dayShutdown.satLowLabel") },
      { key: "good" as const, emoji: "🙂", label: tr("dayShutdown.satGoodLabel") },
      { key: "great" as const, emoji: "🌟", label: tr("dayShutdown.satGreatLabel") },
    ],
    [tr]
  );

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="structuro-page-title text-center">{tr("dayShutdown.title")}</h2>
      <p className="structuro-page-subtitle mx-auto mt-2 max-w-md text-center text-balance">
        {tr("dayShutdown.subtitle")}
      </p>

      {/* 1. Vandaag (afgeronde taken) */}
      <section className="mt-8">
        <h3 className="mb-3 text-base font-semibold text-slate-800">
          {tr("dayShutdown.completedTitle")}
        </h3>
        {completedTasks.length > 0 ? (
          <div className="grid gap-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-slate-800"
              >
                ✓ {task.title}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
            {tr("dayShutdown.noCompleted")}
          </div>
        )}
      </section>

      {/* 2. Hoe voelt het? */}
      <section className="mt-8">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          {tr("dayShutdown.satisfactionTitle")}
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {satisfactionOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSatisfactionLevel(opt.key)}
              className={`flex min-w-[88px] max-w-[160px] flex-1 flex-col items-center gap-1.5 rounded-xl border-2 p-3.5 transition-all active:scale-[0.98] ${
                satisfactionLevel === opt.key
                  ? "border-blue-600 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[26px] leading-none" aria-hidden>
                {opt.emoji}
              </span>
              <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Morgen */}
      <section className="mt-8">
        {checkInLoading ? (
          <p className="text-center text-sm text-slate-500">{tr("common.loading")}</p>
        ) : incompleteDagstartTasks.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center text-sm leading-snug text-slate-700">
            {tr("dayShutdown.allDoneToday")}
          </div>
        ) : (
          <>
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {tr("dayShutdown.tomorrowTitle")}
            </h3>
            <div className="grid max-h-[200px] gap-2 overflow-y-auto">
              {tasksToRemember.map((task) => (
                <label
                  key={task.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    task.selected
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.selected || false}
                    onChange={() => toggleTaskRemember(task.id)}
                    className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-blue-600"
                  />
                  <span className="min-w-0 flex-1 text-sm text-slate-800">{task.title}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 4. Reflectie (optioneel, afgekaderd) */}
      <section className="mt-8 border-t border-slate-100 pt-8">
        <h3 className="mb-3 text-base font-semibold text-slate-800">
          {tr("dayShutdown.reflectionTitle")}{" "}
          <span className="text-xs font-normal italic text-slate-500">
            {tr("dayShutdown.reflectionOptional")}
          </span>
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder={tr("dayShutdown.reflectionPh")}
          className="min-h-[80px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
        />
      </section>

      {saveError ? (
        <p className="mb-3 mt-6 text-center text-sm leading-snug text-red-700" role="alert">
          {saveError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!satisfactionLevel || isSubmitting}
        className={`mt-6 w-full rounded-xl px-4 py-4 text-base font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
          satisfactionLevel && !isSubmitting
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        {isSubmitting ? tr("dayShutdown.submitting") : tr("dayShutdown.submit")}
      </button>
    </div>
  );
}
