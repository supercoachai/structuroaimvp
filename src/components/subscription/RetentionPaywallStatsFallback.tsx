/** Vaste hoogte voor stats: voorkomt layout-shift, geen skeleton-animatie. */
export function RetentionPaywallStatsFallback({
  trialDays,
}: {
  trialDays: number;
}) {
  return (
    <>
      <div className="stats stats--reserved" aria-hidden>
        <div className="stat">
          <div className="n">&nbsp;</div>
          <div className="l">dagen op rij actief</div>
        </div>
        <div className="stat">
          <div className="n">&nbsp;</div>
          <div className="l">taken afgevinkt</div>
        </div>
        <div className="stat">
          <div className="n">&nbsp;</div>
          <div className="l">openstaande taken</div>
        </div>
      </div>
      <div className="streak" aria-hidden>
        {Array.from({ length: trialDays }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </>
  );
}
