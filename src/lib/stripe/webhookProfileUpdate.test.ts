import assert from "node:assert/strict";
import type Stripe from "stripe";
import { applyStripeProfileUpdateIfFresh } from "./webhookProfileUpdate";

function mockDb(
  lastEventAt: string | null,
  capture: { update?: Record<string, unknown> }
) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { stripe_last_event_at: lastEventAt },
            error: null,
          }),
        }),
      }),
      update: (row: Record<string, unknown>) => ({
        eq: async () => {
          capture.update = row;
          return { error: null };
        },
      }),
    }),
  };
}

const baseEvent = (createdSec: number): Stripe.Event =>
  ({
    id: "evt_test",
    type: "customer.subscription.updated",
    created: createdSec,
  }) as Stripe.Event;

void (async () => {
  const newerMs = Date.parse("2026-06-10T12:00:00.000Z");
  const olderMs = Date.parse("2026-06-10T10:00:00.000Z");

  const staleCapture: { update?: Record<string, unknown> } = {};
  const stale = await applyStripeProfileUpdateIfFresh(
    mockDb(new Date(newerMs).toISOString(), staleCapture) as never,
    "cus_test",
    baseEvent(Math.floor(olderMs / 1000)),
    { subscription_status: "past_due" }
  );
  assert.equal(stale, false, "nieuwer last_event_at blokkeert oud event");
  assert.equal(staleCapture.update, undefined);

  const freshCapture: { update?: Record<string, unknown> } = {};
  const ok = await applyStripeProfileUpdateIfFresh(
    mockDb(new Date(olderMs).toISOString(), freshCapture) as never,
    "cus_test",
    baseEvent(Math.floor(newerMs / 1000)),
    { subscription_status: "active" }
  );
  assert.equal(ok, true);
  assert.equal(freshCapture.update?.subscription_status, "active");
  assert.ok(typeof freshCapture.update?.stripe_last_event_at === "string");
})();

console.log("webhookProfileUpdate.test.ts OK");
