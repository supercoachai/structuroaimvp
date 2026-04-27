import { shouldSendProductAnalytics } from "@/lib/analyticsInternal";

export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  console.info("[analytics] event", eventName, params ?? {});
  if (!shouldSendProductAnalytics()) return;
  if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
    window.gtag("event", eventName, params);
  }
};
