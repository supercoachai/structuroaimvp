import type { RetentionStats } from "@/lib/retentionStats";

export function RetentionPaywallStatsUI({ stats }: { stats: RetentionStats }) {
  const { trialDays, daysActive, tasksCompleted, openTasks, streakFilled } =
    stats;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="n">{daysActive}</div>
          <div className="l">dagen op rij actief</div>
        </div>
        <div className="stat">
          <div className="n">{tasksCompleted}</div>
          <div className="l">taken afgevinkt</div>
        </div>
        <div className="stat">
          <div className="n">{openTasks}</div>
          <div className="l">openstaande taken</div>
        </div>
      </div>
      <div className="streak" aria-hidden>
        {Array.from({ length: trialDays }, (_, i) => (
          <span key={i} className={i < streakFilled ? "on" : undefined} />
        ))}
      </div>
    </>
  );
}
