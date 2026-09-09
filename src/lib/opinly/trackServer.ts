import { createOpinlyClient } from "@opinly/backend";

import { isAnalyticsExcludedEmail } from "@/lib/analyticsInternal";

export function parseOpinlyAnonId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  if (!id || id.length > 128) return undefined;
  return id;
}

export async function trackOpinlyServer(
  event: string,
  properties?: Record<string, unknown>,
  opts?: {
    externalEventId?: string;
    email?: string | null;
    anonId?: string | null;
  }
): Promise<void> {
  const apiKey = process.env.OPINLY_API_KEY?.trim();
  if (!apiKey) return;
  const email = opts?.email?.trim() || undefined;
  if (email && isAnalyticsExcludedEmail(email)) return;
  const anonId = opts?.anonId?.trim() || undefined;
  if (!email && !anonId) return;

  try {
    const opinly = createOpinlyClient({ apiKey });
    await opinly.track(event, properties, {
      ...(opts?.externalEventId ? { externalEventId: opts.externalEventId } : {}),
      ...(email ? { email } : {}),
      ...(anonId ? { anonId } : {}),
    });
  } catch (err) {
    console.error("[opinly] track failed", err);
  }
}

export async function trackOpinlyPurchaseServer(input: {
  value: number;
  currency: string;
  orderId: string;
  email?: string | null;
  anonId?: string | null;
}): Promise<void> {
  const orderId = input.orderId.trim();
  if (!orderId) return;
  await trackOpinlyServer(
    "purchase",
    {
      value: input.value,
      currency: input.currency.toUpperCase(),
    },
    {
      externalEventId: orderId,
      email: input.email,
      anonId: input.anonId,
    }
  );
}
