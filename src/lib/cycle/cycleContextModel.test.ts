/**
 * Run: npx tsx src/lib/cycle/cycleContextModel.test.ts
 */
import {
  buildCycleContextView,
  computeCyclePhaseRanges,
} from "./cycleContextModel";

function rangeLabel(
  phases: ReturnType<typeof computeCyclePhaseRanges>,
  key: string
) {
  const p = phases.find((x) => x.key === key)!;
  return `${p.start}-${p.end}`;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const p28 = computeCyclePhaseRanges(28, 5);
assert(rangeLabel(p28, "menstrual") === "1-5", "28 menstrual");
assert(rangeLabel(p28, "follicular") === "6-12", "28 follicular");
assert(rangeLabel(p28, "ovulation") === "13-15", "28 ovulation");
assert(rangeLabel(p28, "luteal") === "16-28", "28 luteal");

const p21 = computeCyclePhaseRanges(21, 5);
assert(rangeLabel(p21, "menstrual") === "1-4", "21 menstrual");
assert(rangeLabel(p21, "follicular") === "5-5", "21 follicular");
assert(rangeLabel(p21, "ovulation") === "6-8", "21 ovulation");
assert(rangeLabel(p21, "luteal") === "9-21", "21 luteal");

const p35 = computeCyclePhaseRanges(35, 5);
assert(rangeLabel(p35, "menstrual") === "1-5", "35 menstrual");
assert(rangeLabel(p35, "follicular") === "6-19", "35 follicular");
assert(rangeLabel(p35, "ovulation") === "20-22", "35 ovulation");
assert(rangeLabel(p35, "luteal") === "23-35", "35 luteal");

const view = buildCycleContextView(12, 28, 5);
assert(view.day === 12, "view day");
assert(view.activePhase === "follicular", "view phase");
assert(view.ringSegments.length === 4, "four ring segments");

console.log("cycleContextModel.test.ts: ok");
