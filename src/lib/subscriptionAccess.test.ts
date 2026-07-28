import assert from "node:assert/strict";
import {
  profileHasAppAccess,
  profileHasAppAccessOrGrace,
} from "./subscriptionAccess";
import {
  V2_CARD_TRIAL_CUTOFF_ISO,
  isV2CardTrialCohort,
} from "./stripe/v2CardTrial";
import { hasFreeTrial } from "./freeTrialAccess";

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

const cutoffMs = new Date(V2_CARD_TRIAL_CUTOFF_ISO).getTime();
const legacyCreatedAt = new Date(
  Math.min(Date.now() - 60 * 60 * 1000, cutoffMs - 60 * 60 * 1000)
).toISOString();

if (hasFreeTrial(legacyCreatedAt) && !isV2CardTrialCohort(legacyCreatedAt)) {
  assert.equal(
    profileHasAppAccessOrGrace({
      subscription_status: "none",
      subscription_current_period_end: null,
      created_at: legacyCreatedAt,
      last_dagstart_date: null,
    }),
    true,
    "legacy cohort binnen free trial: toegang"
  );
} else {
  // Na cutoff+3d is free-trial historisch; card-cohort zonder Stripe blijft dicht.
  assert.equal(
    isV2CardTrialCohort(new Date().toISOString()),
    true,
    "na cutoff: nieuwe accounts zijn card-cohort"
  );
}

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: new Date(
      Math.max(Date.now(), cutoffMs + 60_000)
    ).toISOString(),
    last_dagstart_date: "2026-07-28",
  }),
  false,
  "v2 card-cohort zonder Stripe: geen free trial"
);

assert.equal(
  profileHasAppAccessOrGrace({
    subscription_status: "none",
    subscription_current_period_end: null,
    created_at: new Date(
      Math.max(Date.now(), cutoffMs + 60_000)
    ).toISOString(),
    last_dagstart_date: "2026-07-28",
    signup_source: "jasper_podcast",
  }),
  true,
  "Jasper: 7d app-trial zonder kaart, ook na card-cutoff"
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
