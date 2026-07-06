/**
 * Eenmalige bonus-trialdagen voor de Stripe-checkout, per account.
 *
 * De kolom profiles.checkout_bonus_trial_days is alleen door service_role te
 * schrijven (zie migratie 20260706150000). De checkout-routes lezen hem hier;
 * de Stripe-webhook zet hem terug naar 0 zodra checkout.session.completed het
 * abonnement activeert, zodat de bonus niet herbruikbaar is.
 */
export function readCheckoutBonusTrialDays(
  profile: { checkout_bonus_trial_days?: unknown } | null | undefined
): number {
  const raw = profile?.checkout_bonus_trial_days;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(90, Math.floor(raw)));
}
