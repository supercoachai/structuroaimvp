/**
 * Run: npm run test:focus-events
 */
import assert from "node:assert/strict";
import {
  focusSessionMetrics,
  focusEnergyToAnalytics,
} from "./focusSessionEvents";

assert.equal(focusEnergyToAnalytics("low"), "laag");
assert.equal(focusEnergyToAnalytics("medium"), "normaal");
assert.equal(focusEnergyToAnalytics("high"), "hoog");

const completed = focusSessionMetrics(1, 0, "abc", "normaal");
assert.equal(completed.duration_planned_sec, 60);
assert.equal(completed.duration_actual_sec, 60);
assert.equal(completed.completion_ratio, 1);
assert.equal(completed.task_id, "abc");

const early = focusSessionMetrics(60, 3540, "abc", "laag");
assert.equal(early.duration_planned_sec, 3600);
assert.equal(early.duration_actual_sec, 60);
assert.ok(early.completion_ratio > 0 && early.completion_ratio < 0.05);

console.log("focusSessionEvents: all checks ok");
