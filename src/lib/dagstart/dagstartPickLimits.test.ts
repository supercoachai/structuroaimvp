/**
 * Run: npx tsx src/lib/dagstart/dagstartPickLimits.test.ts
 */
import assert from "node:assert/strict";
import {
  analyzeDagstartKeep,
  clampDagstartSelection,
  resolveDagstartSavedTaskIds,
} from "./dagstartPickLimits";
import type { DagstartTaskCard } from "@/components/dagstart/design/types";

function card(
  id: string,
  deadline: string | null = null
): DagstartTaskCard {
  return {
    id,
    title: id,
    appEnergy: "medium",
    energy: "normaal",
    minutes: 15,
    dueAt: deadline ? "2026-05-26T12:00:00Z" : null,
    deadline,
    overdue: false,
  };
}

assert.equal(analyzeDagstartKeep(card("a"), [], 2, 0).kind, "allow");

assert.equal(analyzeDagstartKeep(card("c"), ["a", "b"], 2, 0).kind, "reject");

assert.equal(
  analyzeDagstartKeep(card("c", "Vandaag"), ["a", "b"], 2, 0).kind,
  "overflow"
);

assert.deepEqual(
  resolveDagstartSavedTaskIds(["a", "b", "c"], 2, 1),
  ["a", "b", "c"]
);
assert.deepEqual(resolveDagstartSavedTaskIds(["a", "b", "c", "d"], 2, 1), [
  "a",
  "b",
  "c",
]);

const tasksById = new Map<string, DagstartTaskCard>([
  ["a", card("a")],
  ["b", card("b")],
  ["c", card("c")],
  ["d", card("d")],
]);
assert.deepEqual(
  clampDagstartSelection(["a", "b", "c", "d"], tasksById, 2, 0),
  ["a", "b"]
);

console.log("dagstartPickLimits.test.ts OK");
