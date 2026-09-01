import assert from "node:assert/strict";
import { resolveRetentionPaywallReason } from "./retentionPaywallAccess";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) =>
  new Date(now + d * 24 * 60 * 60 * 1000).toISOString();

/** Pre v2 card-cutoff: legacy 3-dagen free trial (inmiddels altijd verlopen). */
const LEGACY_CREATED = "2026-07-20T10:00:00.000Z";

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: hoursAgo(1),
    signup_source: "organic",
  }),
  "trial_expired",
  "v2 card-cohort zonder Stripe: paywall, geen legacy gratis proef"
);

assert.equal(
  resolveRetentionPaywallReason({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: LEGACY_CREATED,
    signup_source: "organic",
  }),
  "trial_expired",
  "legacy pre-cutoff na 3 dagen: retention-paywall"
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
    email: "info@structuro.eu",
    subscription_status: "trial_expired",
    subscription_current_period_end: null,
    created_at: "2020-01-01T00:00:00.000Z",
    signup_source: "organic",
    app_trial_override_until: daysFromNow(1600),
  }),
  null,
  "intern teamaccount: nooit paywall op /abonnement"
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
