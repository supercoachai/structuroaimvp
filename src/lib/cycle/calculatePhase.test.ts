/**
 * Run: npx tsx src/lib/cycle/calculatePhase.test.ts
 * Bewijst dat de fase-berekening klopt voor de standaard 28-daagse cyclus en edge cases.
 */
import assert from "node:assert/strict";
import { calculateCyclePhase } from "./calculatePhase";

function dayOffset(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const start = new Date(2026, 0, 1);

assert.equal(calculateCyclePhase(start, 28, start), "menstrual");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 4)), "menstrual");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 5)), "follicular");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 12)), "ovulation");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 13)), "ovulation");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 14)), "ovulation");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 15)), "luteal");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 27)), "luteal");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 28)), "menstrual");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, -3)), "unknown");
assert.equal(calculateCyclePhase(start, 28, dayOffset(start, 200)), "unknown");

assert.equal(calculateCyclePhase(start, 21, dayOffset(start, 0)), "menstrual");
assert.equal(calculateCyclePhase(start, 21, dayOffset(start, 6)), "ovulation");
assert.equal(calculateCyclePhase(start, 21, dayOffset(start, 9)), "luteal");

assert.equal(calculateCyclePhase(start, 35, dayOffset(start, 5)), "follicular");
assert.equal(calculateCyclePhase(start, 35, dayOffset(start, 20)), "ovulation");
assert.equal(calculateCyclePhase(start, 35, dayOffset(start, 22)), "luteal");

assert.equal(calculateCyclePhase(new Date("invalid"), 28), "unknown");
assert.equal(calculateCyclePhase(start, 5), "unknown");
assert.equal(calculateCyclePhase(start, Number.NaN), "unknown");

console.log("calculateCyclePhase: all checks ok");
