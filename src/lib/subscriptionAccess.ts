/** Toegang tot de app na betaalde launch: actief, of opgezegd maar nog binnen betaalperiode. */

export function profileHasAppAccess(row: {
  subscription_status: string | null | undefined;
  subscription_current_period_end: string | null | undefined;
}): boolean {
  const s = row.subscription_status;
  if (s === "refunded" || s === "past_due" || s === "expired") return false;
  if (s === "active") return true;
  if (s === "cancelled") {
    const end = row.subscription_current_period_end;
    if (!end) return false;
    return new Date(end).getTime() > Date.now();
  }
  return false;
}
