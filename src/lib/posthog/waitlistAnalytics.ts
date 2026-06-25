import { captureServerEvent } from "./server";
import type { ServerEventRequestContext } from "./serverEventContext";

export type WaitlistSignupSite = "ai" | "eu";

/**
 * Wachtlijst-conversie server-side (geen e-mail/naam). Werkt ook zonder cookie-toestemming.
 */
export async function captureWaitlistSignupServer(
  params: {
    source: string;
    site: WaitlistSignupSite;
  },
  requestContext?: ServerEventRequestContext | null
): Promise<void> {
  const distinctId = crypto.randomUUID();
  await captureServerEvent(
    distinctId,
    "waitlist_signup_completed",
    {
      source: params.source || "direct",
      site: params.site,
      channel: "server",
      $process_person_profile: false,
    },
    requestContext
  );
}
