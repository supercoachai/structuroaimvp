/**
 * Huidige onboarding-flowversie. Profielen met lagere of ontbrekende
 * `onboarding_version` moeten de intro opnieuw doorlopen.
 */
export const ONBOARDING_VERSION_CURRENT = 2;

export function isProfileOnboardingUpToDate(
  onboardingCompleted: boolean | null | undefined,
  onboardingVersion: number | null | undefined
): boolean {
  if (onboardingCompleted !== true) return false;
  const raw =
    onboardingVersion == null
      ? NaN
      : typeof onboardingVersion === "number"
        ? onboardingVersion
        : Number(onboardingVersion);
  if (!Number.isFinite(raw)) return false;
  return raw >= ONBOARDING_VERSION_CURRENT;
}
