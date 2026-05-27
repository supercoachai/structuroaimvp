import { captureServerEvent } from "./server";

export type WaitlistSignupSite = "ai" | "eu";

/**
 * Wachtlijst-conversie server-side (geen e-mail/naam). Werkt ook zonder cookie-toestemming.
 */
export async function captureWaitlistSignupServer(params: {
  source: string;
  site: WaitlistSignupSite;
}): Promise<void> {
  const distinctId = crypto.randomUUID();
  await captureServerEvent(distinctId, "waitlist_signup_completed", {
    source: params.source || "direct",
    site: params.site,
    channel: "server",
    $process_person_profile: false,
  });
}
