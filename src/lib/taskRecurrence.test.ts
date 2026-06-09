import assert from "node:assert/strict";
import test from "node:test";
import {
  addDaysToYmd,
  buildRecurringCompletionUpdate,
  isIntervalRecurringVisible,
  isRecurringDueToday,
  resolveInitialIntervalNextDueAt,
} from "./taskRecurrence";

test("interval task is due on and after next due date", () => {
  const task = {
    repeat: "interval",
    repeatIntervalDays: 14,
    repeatNextDueAt: "2026-06-09",
    repeatExcludeDates: [],
  };
  assert.equal(isRecurringDueToday(task, "2026-06-08"), false);
  assert.equal(isRecurringDueToday(task, "2026-06-09"), true);
  assert.equal(isRecurringDueToday(task, "2026-06-12"), true);
});

test("completing interval task shifts next due by interval days", () => {
  const task = {
    repeat: "interval",
    repeatIntervalDays: 14,
    repeatNextDueAt: "2026-06-09",
    repeatExcludeDates: [],
  };
  const update = buildRecurringCompletionUpdate(task, "2026-06-09");
  assert.equal(update.repeatNextDueAt, "2026-06-23");
  assert.equal(isIntervalRecurringVisible({ ...task, ...update }, "2026-06-10"), false);
});

test("completing interval task respects custom interval days", () => {
  const task = {
    repeat: "interval",
    repeatIntervalDays: 7,
    repeatNextDueAt: "2026-06-09",
    repeatExcludeDates: [],
  };
  const update = buildRecurringCompletionUpdate(task, "2026-06-09");
  assert.equal(update.repeatNextDueAt, "2026-06-16");
});

test("resolveInitialIntervalNextDueAt uses schedule day", () => {
  assert.equal(
    resolveInitialIntervalNextDueAt("2026-06-13", "2026-06-09"),
    "2026-06-13"
  );
});

test("addDaysToYmd adds calendar days", () => {
  assert.equal(addDaysToYmd("2026-06-09", 14), "2026-06-23");
});
