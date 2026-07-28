import assert from "node:assert/strict";
import {
  profileHasAppAccess,
  profileHasAppAccessOrGrace,
} from "./subscriptionAccess";

assert.equal(
  profileHasAppAccess({
    subscription_status: "trialing",
    subscription_current_period_end: null,
  }),
  false,
  "trialing zonder einddatum: geen toegang"
);

assert.equal(
  profileHasAppAccess({
    subscription_status: "trialing",
    subscription_current_period_end: new Date(
      Date.now() + 86_400_000
    ).toISOString(),
  }),
  true,
  "trialing met toekomstige einddatum: toegang"
);

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "trial_expired",
    subscription_current_period_end: null,
    created_at: new Date().toISOString(),
    last_dagstart_date: null,
  }),
  false
);

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: new Date().toISOString(),
    last_dagstart_date: null,
  }),
  true
);

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "active",
    subscription_current_period_end: null,
    created_at: null,
    last_dagstart_date: null,
  }),
  true
);

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "trial_expired",
    subscription_current_period_end: null,
    created_at: "2020-01-01T00:00:00.000Z",
    last_dagstart_date: null,
    app_trial_override_until: new Date(Date.now() + 86_400_000).toISOString(),
  }),
  true,
  "override actief: toegang ondanks trial_expired"
);

assert.equal(
  profileHasAppAccessOrGrace({
    email: "info@structuro.eu",
    subscription_status: "trial_expired",
    subscription_current_period_end: null,
    created_at: "2020-01-01T00:00:00.000Z",
    last_dagstart_date: null,
  }),
  true,
  "intern teamaccount: toegang ondanks trial_expired"
);

console.log("subscriptionAccess.test.ts OK");
