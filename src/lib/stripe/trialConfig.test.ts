/**
 * Run: npx tsx src/lib/stripe/trialConfig.test.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_STRIPE_TRIAL_DAYS,
  resolveStripeTrialDaysForSignupSource,
} from "./trialConfig";

assert.equal(resolveStripeTrialDaysForSignupSource(null), DEFAULT_STRIPE_TRIAL_DAYS);
assert.equal(resolveStripeTrialDaysForSignupSource("direct"), DEFAULT_STRIPE_TRIAL_DAYS);
assert.equal(resolveStripeTrialDaysForSignupSource("adhd_cafe"), 14);
assert.equal(resolveStripeTrialDaysForSignupSource("ADHD_CAFE"), 14);

console.log("trialConfig.test.ts: ok");
