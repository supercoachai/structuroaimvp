import { resolvePostSignupPath } from "@/lib/registrationGate";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

type PostSignupProfile = Parameters<typeof resolvePostSignupPath>[0];
type PostSignupOptions = Parameters<typeof resolvePostSignupPath>[2];

/** Na signup: event-users en andere onboarding-routes eerst naar PWA-hint op mobiel. */
export function resolveClientPostSignupPath(
  profile: PostSignupProfile,
  email: string | null | undefined,
  options?: PostSignupOptions
): string {
  const path = resolvePostSignupPath(profile, email, options);
  if (path === "/onboarding" && shouldShowPwaInstallHint()) {
    return "/welkom/install";
  }
  return path;
}
