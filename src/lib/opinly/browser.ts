import { isAnalyticsExcludedEmail } from "@/lib/analyticsInternal";

export type OpinlyBrowser = {
  anonId?: string;
  identify: (input: { email: string; userId?: string }) => void;
  track: (
    name: string,
    props?: Record<string, unknown>,
    opts?: { externalEventId?: string }
  ) => void;
};

declare global {
  interface Window {
    opinly?: OpinlyBrowser;
  }
}

function withOpinly(run: (opinly: OpinlyBrowser) => void): void {
  if (typeof window === "undefined") return;
  if (window.opinly) {
    run(window.opinly);
    return;
  }
  const onReady = () => {
    window.removeEventListener("opinly:ready", onReady);
    if (window.opinly) run(window.opinly);
  };
  window.addEventListener("opinly:ready", onReady);
}

export function getOpinlyAnonId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const id = window.opinly?.anonId?.trim();
  return id || undefined;
}

export function identifyOpinlyUser(input: {
  email?: string | null;
  userId?: string | null;
}): void {
  const email = input.email?.trim();
  if (!email || isAnalyticsExcludedEmail(email)) return;
  withOpinly((opinly) => {
    opinly.identify({
      email,
      ...(input.userId ? { userId: input.userId } : {}),
    });
  });
}

export function trackOpinly(
  name: string,
  props?: Record<string, unknown>,
  opts?: { externalEventId?: string }
): void {
  withOpinly((opinly) => {
    opinly.track(name, props, opts);
  });
}

export function trackOpinlyPurchase(input: {
  value: number;
  currency: string;
  orderId: string;
}): void {
  const orderId = input.orderId.trim();
  if (!orderId) return;
  trackOpinly(
    "purchase",
    {
      value: input.value,
      currency: input.currency.toUpperCase(),
    },
    { externalEventId: orderId }
  );
}
