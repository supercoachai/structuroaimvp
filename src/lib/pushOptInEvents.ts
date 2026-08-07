import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";

export type PushOptInSurface = "consent" | "soft_prompt" | "return_permission";

export function trackPushOptInClicked(surface: PushOptInSurface): void {
  trackClientFunnelEvent("push_opt_in_clicked", { surface });
}

export function trackPushOptInSuccess(surface: PushOptInSurface): void {
  trackClientFunnelEvent("push_opt_in_success", { surface });
}

export function trackPushOptInDenied(surface: PushOptInSurface): void {
  trackClientFunnelEvent("push_opt_in_denied", { surface });
}

export function trackPushOptInSkipped(surface: PushOptInSurface): void {
  trackClientFunnelEvent("push_opt_in_skipped", { surface });
}

export function trackPushNeedsHomescreen(surface: PushOptInSurface): void {
  trackClientFunnelEvent("push_needs_homescreen", { surface });
}

export function trackPushSoftPromptShown(): void {
  trackClientFunnelEvent("push_soft_prompt_shown", { surface: "soft_prompt" });
}
