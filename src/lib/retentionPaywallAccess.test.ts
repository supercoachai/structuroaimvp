import assert from "node:assert/strict";
import { resolveRetentionPaywallReason } from "./retentionPaywallAccess";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) =>
  new Date(now + d * 24 * 60 * 60 * 1000).toISOString();

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: hoursAgo(1),
    signup_source: "organic",
  }),
  "trial_active",
  "nieuwe user in gratis proef: optioneel abonneren, geen retention-copy"
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
