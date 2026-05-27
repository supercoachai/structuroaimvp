/**
 * Run: npx tsx src/lib/dagstart/buildDagstartTaskPlan.test.ts
 */
import assert from "node:assert/strict";
import { buildDagstartTaskPlan } from "./buildDagstartTaskPlan";

const TODAY = "2026-05-26";

function task(
  id: string,
  dueAt: string | null,
  energy: "low" | "medium" | "high" = "medium"
) {
  return {
    id,
    title: `Task ${id}`,
    dueAt,
    energyLevel: energy,
    impact: "🌱",
  };
}

{
  const pool = [
    task("d1", "2026-05-26"),
    task("d2", "2026-05-25"),
    task("n1", null, "low"),
    task("n2", null, "medium"),
  ];

  const low = buildDagstartTaskPlan(
    pool,
    pool,
    "low",
    1,
    TODAY,
    () => 3
  );
  assert.deepEqual(
    low.deadlineAutoFill.map((t) => t.id),
    ["d2"]
  );
  assert.deepEqual(
    low.deadlineOverflow.map((t) => t.id),
    ["d1"]
  );
  assert.equal(low.structuroFill.length, 0);
}

{
  const pool = [
    task("d1", "2026-05-26"),
    task("n1", null, "low"),
    task("n2", null, "medium"),
  ];

  const high = buildDagstartTaskPlan(
    pool,
    pool,
    "high",
    3,
    TODAY,
    () => 3
  );
  assert.deepEqual(
    high.deadlineAutoFill.map((t) => t.id),
    ["d1"]
  );
  assert.equal(high.deadlineOverflow.length, 0);
  assert.equal(high.structuroFill.length, 2);
  assert.ok(!high.structuroFill.some((t) => t.id === "d1"));
}

console.log("buildDagstartTaskPlan.test.ts: all assertions passed");
