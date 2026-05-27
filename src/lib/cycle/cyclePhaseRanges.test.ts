/**
 * Run: npx tsx src/lib/cycle/cyclePhaseRanges.test.ts
 */
import assert from "node:assert/strict";
import {
  computeCyclePhaseBounds,
  resolveCyclePhaseForDay,
  resolvePhaseKeyForDay,
} from "./cyclePhaseRanges";
import { computeCyclePhaseRanges } from "./cycleContextModel";

function rangeLabel(
  cycleLength: number,
  menstruationDuration: number,
  key: string
) {
  const phases = computeCyclePhaseRanges(cycleLength, menstruationDuration);
  const p = phases.find((x) => x.key === key)!;
  return `${p.start}-${p.end}`;
}

// cyclus 28, menstruatie 5
{
  const bounds = computeCyclePhaseBounds(28, 5);
  assert.equal(rangeLabel(28, 5, "menstrual"), "1-5");
  assert.equal(rangeLabel(28, 5, "follicular"), "6-12");
  assert.equal(rangeLabel(28, 5, "ovulation"), "13-15");
  assert.equal(rangeLabel(28, 5, "luteal"), "16-28");
  assert.equal(resolvePhaseKeyForDay(12, bounds), "follicular");
  assert.equal(resolvePhaseKeyForDay(13, bounds), "ovulation");
  assert.equal(resolvePhaseKeyForDay(16, bounds), "luteal");
}

// cyclus 21, menstruatie clamped naar 4
{
  assert.equal(rangeLabel(21, 5, "menstrual"), "1-4");
  assert.equal(rangeLabel(21, 5, "follicular"), "5-5");
  assert.equal(rangeLabel(21, 5, "ovulation"), "6-8");
  assert.equal(rangeLabel(21, 5, "luteal"), "9-21");
}

// cyclus 35, menstruatie 5
{
  assert.equal(rangeLabel(35, 5, "menstrual"), "1-5");
  assert.equal(rangeLabel(35, 5, "follicular"), "6-19");
  assert.equal(rangeLabel(35, 5, "ovulation"), "20-22");
  assert.equal(rangeLabel(35, 5, "luteal"), "23-35");
}

assert.equal(resolveCyclePhaseForDay(12, 28, 5), "follicular");
assert.equal(resolveCyclePhaseForDay(13, 28, 5), "ovulation");

console.log("cyclePhaseRanges.test.ts: ok");
