/** Handmatige trialverlenging (profiles.app_trial_override_until, service_role only). */
export function hasActiveAppTrialOverride(
  app_trial_override_until: string | null | undefined
): boolean {
  if (!app_trial_override_until) return false;
  const end = new Date(app_trial_override_until).getTime();
  if (isNaN(end)) return false;
  return Date.now() < end;
}
