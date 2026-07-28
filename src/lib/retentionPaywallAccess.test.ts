import assert from "node:assert/strict";
import { resolveRetentionPaywallReason } from "./retentionPaywallAccess";
import { V2_CARD_TRIAL_CUTOFF_ISO } from "./stripe/v2CardTrial";
import { hasFreeTrial } from "./freeTrialAccess";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) =>
  new Date(now + d * 24 * 60 * 60 * 1000).toISOString();

const cutoffMs = new Date(V2_CARD_TRIAL_CUTOFF_ISO).getTime();
const legacyCreatedAt = new Date(
  Math.min(now - 60 * 60 * 1000, cutoffMs - 60 * 60 * 1000)
).toISOString();

if (hasFreeTrial(legacyCreatedAt)) {
  assert.equal(
    resolveRetentionPaywallReason({
      subscription_status: "none",
      subscription_current_period_end: null,
      created_at: legacyCreatedAt,
      signup_source: "organic",
    }),
    "trial_active",
    "legacy cohort in gratis proef: optioneel abonneren, geen retention-copy"
  );
}

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: new Date(Math.max(now - 60_000, cutoffMs + 60_000)).toISOString(),
    signup_source: "organic",
  }),
  "trial_expired",
  "v2 card-cohort zonder Stripe: hard gate (geen soft trial_active)"
);

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: hoursAgo(96),
    signup_source: "organic",
  }),
  "trial_expired",
  "proef voorbij: retention-paywall"
);

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "active",
    subscription_current_period_end: daysFromNow(20),
    created_at: hoursAgo(96),
    signup_source: "organic",
  }),
  null,
  "actief abonnement: redirect naar instellingen"
);

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "trialing",
    subscription_current_period_end: daysFromNow(5),
    created_at: hoursAgo(1),
    signup_source: "organic",
  }),
  null,
  "Stripe trial: geen paywall op /abonnement"
);

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "cancelled",
    subscription_current_period_end: hoursAgo(24),
    created_at: hoursAgo(200),
    signup_source: "organic",
  }),
  "subscription_ended",
  "opgezegd en periode voorbij"
);

console.log("retentionPaywallAccess.test.ts: ok");
