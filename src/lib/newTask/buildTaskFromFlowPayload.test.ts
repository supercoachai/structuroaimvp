import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskFromFlowPayload } from "./buildTaskFromFlowPayload";

test("buildTaskFromFlowPayload zet wekelijkse herhaling met ankerdag ook zonder scheduleDate", () => {
  const task = buildTaskFromFlowPayload({
    title: "Bed verschonen",
    energy: "medium",
    durationMin: 30,
    deadline: null,
    microsteps: [],
    repeat: "weekly",
  });

  assert.equal(task.repeat, "weekly");
  assert.match(String(task.created_at ?? ""), /^\d{4}-\d{2}-\d{2}T/);
});

test("buildTaskFromFlowPayload zet interval met repeatNextDueAt", () => {
  const task = buildTaskFromFlowPayload({
    title: "Bed verschonen",
    energy: "medium",
    durationMin: 30,
    deadline: null,
    microsteps: [],
    repeat: "interval",
    repeatIntervalDays: 14,
  });

  assert.equal(task.repeat, "interval");
  assert.equal(task.repeatIntervalDays, 14);
  assert.match(String(task.repeatNextDueAt ?? ""), /^\d{4}-\d{2}-\d{2}$/);
});
