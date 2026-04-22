import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

/** Product-events (console in dev; koppeling naar endpoint kan later). */
export function track(event: string, props: Record<string, unknown> = {}) {
  if (!shouldSendProductAnalytics()) return;
  try {
    console.log("[track]", event, props);
  } catch {
    /* ignore */
  }
}
