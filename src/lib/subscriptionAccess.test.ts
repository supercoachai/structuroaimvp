import assert from "node:assert/strict";
import { profileHasAppAccessOrGrace } from "./subscriptionAccess";

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

console.log("subscriptionAccess.test.ts OK");
