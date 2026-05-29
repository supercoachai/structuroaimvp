/**
 * Run: npx tsx src/lib/dagstart/deadlineToday.test.ts
 */
import assert from "node:assert/strict";
import {
  buildDeadlineDagstartPlan,
  calendarDayDiff,
  getDeadlineTasksDueToday,
  getDeadlineTasksForDagstartFill,
  isDueToday,
  isDueExactlyToday,
  isDueOnOrBeforeToday,
  isDueStrictlyAfterToday,
  isTaskOverdue,
  parseDueCalendarDayAmsterdam,
  sortDeadlineTasks,
} from "./deadlineToday";

const TODAY = "2026-05-26";

function task(
  id: string,
  dueAt: string | null,
  extra: Record<string, unknown> = {}
) {
  return { id, title: `Task ${id}`, dueAt, ...extra };
}

// parseDueCalendarDayAmsterdam
{
  assert.equal(parseDueCalendarDayAmsterdam("2026-05-26T08:00:00.000Z"), "2026-05-26");
  assert.equal(parseDueCalendarDayAmsterdam("2026-05-26"), "2026-05-26");
  assert.equal(parseDueCalendarDayAmsterdam(null), null);
}

// isDueStrictlyAfterToday / overdue
{
  assert.equal(isDueStrictlyAfterToday("2026-05-27", TODAY), true);
  assert.equal(isDueStrictlyAfterToday("2026-05-26", TODAY), false);
  assert.equal(isDueOnOrBeforeToday("2026-05-25", TODAY), true);
  assert.equal(isTaskOverdue("2026-05-25", TODAY), true);
  assert.equal(isTaskOverdue("2026-05-26", TODAY), false);
}

// sort: overdue first, then oldest due date, then shortest duration, then title
{
  const sorted = sortDeadlineTasks(
    [
      task("a", "2026-05-26", { duration: 30 }),
      task("b", "2026-05-24", { duration: 15 }),
      task("c", "2026-05-25", { duration: 45 }),
    ],
    TODAY
  );
  assert.deepEqual(
    sorted.map((t) => t.id),
    ["b", "c", "a"]
  );

  const sameDay = sortDeadlineTasks(
    [
      task("long", "2026-05-26", { duration: 60, title: "Zebra" }),
      task("short", "2026-05-26", { duration: 15, title: "Alpha" }),
    ],
    TODAY
  );
  assert.deepEqual(
    sameDay.map((t) => t.id),
    ["short", "long"]
  );

  const sameDur = sortDeadlineTasks(
    [
      task("b", "2026-05-26", { duration: 15, title: "Beta" }),
      task("a", "2026-05-26", { duration: 15, title: "Alpha" }),
    ],
    TODAY
  );
  assert.deepEqual(
    sameDur.map((t) => t.id),
    ["a", "b"]
  );

  const withNoDue = sortDeadlineTasks(
    [
      task("nodeadline", null, { duration: 10, title: "Later" }),
      task("due", "2026-05-26", { duration: 10, title: "Due" }),
    ],
    TODAY
  );
  assert.deepEqual(
    withNoDue.map((t) => t.id),
    ["due", "nodeadline"]
  );
}

// isDueToday alias
{
  assert.equal(isDueToday("2026-05-26", TODAY), true);
  assert.equal(isDueToday("2026-05-27", TODAY), false);
}

// eligibility filters
{
  const due = getDeadlineTasksDueToday(
    [
      task("ok", "2026-05-26"),
      task("future", "2026-05-30"),
      task("done", "2026-05-26", { done: true }),
      task("skip", "2026-05-26", { notToday: true }),
      task("med", "2026-05-26", { source: "medication" }),
      task("none", null),
    ],
    TODAY
  );
  assert.deepEqual(due.map((t) => t.id), ["ok"]);
}

// buildDeadlineDagstartPlan: alleen deadlines vandaag, overflow = vandaag - maxSlots
{
  const tasks = [
    task("1", "2026-05-24"),
    task("2", "2026-05-26"),
    task("3", "2026-05-25"),
  ];

  const low = buildDeadlineDagstartPlan(tasks, 1, TODAY);
  assert.deepEqual(
    low.autoFill.map((t) => t.id),
    ["2"]
  );
  assert.equal(low.overflow.length, 0);

  const high = buildDeadlineDagstartPlan(tasks, 3, TODAY);
  assert.deepEqual(
    high.autoFill.map((t) => t.id),
    ["2"]
  );
  assert.equal(high.overflow.length, 0);

  const manyToday = buildDeadlineDagstartPlan(
    [
      task("a", "2026-05-26", { duration: 30 }),
      task("b", "2026-05-26", { duration: 15 }),
      task("c", "2026-05-26", { duration: 45 }),
    ],
    2,
    TODAY
  );
  assert.equal(manyToday.autoFill.length, 2);
  assert.equal(manyToday.overflow.length, 1);
}

// getDeadlineTasksForDagstartFill vs getDeadlineTasksDueToday
{
  const tasks = [
    task("today", "2026-05-26"),
    task("overdue", "2026-05-24"),
  ];
  assert.deepEqual(
    getDeadlineTasksForDagstartFill(tasks, TODAY).map((t) => t.id),
    ["today"]
  );
  assert.deepEqual(
    getDeadlineTasksDueToday(tasks, TODAY).map((t) => t.id),
    ["overdue", "today"]
  );
  assert.equal(isDueExactlyToday("2026-05-26", TODAY), true);
  assert.equal(isDueExactlyToday("2026-05-24", TODAY), false);
}

// calendarDayDiff
{
  assert.equal(calendarDayDiff("2026-05-26", "2026-05-27"), 1);
  assert.equal(calendarDayDiff("2026-05-26", "2026-05-26"), 0);
  assert.equal(calendarDayDiff("2026-05-26", "2026-05-24"), -2);
}

console.log("deadlineToday.test.ts: all assertions passed");
