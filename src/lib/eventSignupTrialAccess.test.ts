/**
 * Run: npx tsx src/lib/eventSignupTrialAccess.test.ts
 */
import assert from "node:assert/strict";
import {
  eventSignupTrialDaysLeft,
  eventSignupTrialExpired,
  hasEventSignupAppTrial,
} from "./eventSignupTrialAccess";

const created = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

assert.equal(hasEventSignupAppTrial(created, "adhd_cafe"), true);
assert.ok(eventSignupTrialDaysLeft(created, "adhd_cafe") >= 11);
assert.equal(eventSignupTrialExpired(created, "adhd_cafe"), false);
assert.equal(hasEventSignupAppTrial(created, "direct"), false);

const expiredCreated = new Date(
  Date.now() - 15 * 24 * 60 * 60 * 1000
).toISOString();
assert.equal(hasEventSignupAppTrial(expiredCreated, "adhd_cafe"), false);
assert.equal(eventSignupTrialExpired(expiredCreated, "adhd_cafe"), true);

console.log("eventSignupTrialAccess.test.ts: ok");
