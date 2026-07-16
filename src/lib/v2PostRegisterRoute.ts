import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

/** Na account/registratie in v2: eerst PWA-hint op mobiel, anders direct onboarding. */
export function v2RouteAfterRegister(): "/v2/install" | "/v2/onboarding" {
  return shouldShowPwaInstallHint() ? "/v2/install" : "/v2/onboarding";
}
