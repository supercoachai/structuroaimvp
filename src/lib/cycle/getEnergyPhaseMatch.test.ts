/**
 * Run: npx tsx src/lib/cycle/getEnergyPhaseMatch.test.ts
 */
import assert from "node:assert/strict";
import {
  getEnergyPhaseMatch,
  getSuggestedEnergyForPhase,
} from "./getEnergyPhaseMatch";

assert.equal(getSuggestedEnergyForPhase("menstrual"), "low");
assert.equal(getSuggestedEnergyForPhase("follicular"), "medium");
assert.equal(getSuggestedEnergyForPhase("ovulation"), "high");
assert.equal(getSuggestedEnergyForPhase("luteal"), "low");

assert.deepEqual(getEnergyPhaseMatch("menstrual", "low"), {
  match: "match",
  direction: "none",
});
assert.deepEqual(getEnergyPhaseMatch("menstrual", "medium"), {
  match: "soft-mismatch",
  direction: "higher",
});
assert.deepEqual(getEnergyPhaseMatch("menstrual", "high"), {
  match: "strong-mismatch",
  direction: "higher",
});

assert.deepEqual(getEnergyPhaseMatch("follicular", "medium"), {
  match: "match",
  direction: "none",
});
assert.deepEqual(getEnergyPhaseMatch("follicular", "low"), {
  match: "soft-mismatch",
  direction: "lower",
});
assert.deepEqual(getEnergyPhaseMatch("follicular", "high"), {
  match: "soft-mismatch",
  direction: "higher",
});

assert.deepEqual(getEnergyPhaseMatch("ovulation", "high"), {
  match: "match",
  direction: "none",
});
assert.deepEqual(getEnergyPhaseMatch("ovulation", "medium"), {
  match: "soft-mismatch",
  direction: "lower",
});
assert.deepEqual(getEnergyPhaseMatch("ovulation", "low"), {
  match: "strong-mismatch",
  direction: "lower",
});

assert.equal(getEnergyPhaseMatch("luteal", "low").match, "match");
assert.equal(getEnergyPhaseMatch("luteal", "high").match, "strong-mismatch");

console.log("getEnergyPhaseMatch: all checks ok");
