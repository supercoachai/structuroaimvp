/**
 * Run: npx tsx src/lib/buildTaskPutDbUpdates.test.ts
 * Bewijst dat een partiele update (alleen done) geen andere keys in dbUpdates zet.
 */
import assert from "node:assert/strict";
import { buildTaskPutDbUpdates } from "./buildTaskPutDbUpdates";

const onlyDone = buildTaskPutDbUpdates({ done: true });
assert.deepEqual(onlyDone, { done: true });
assert.equal("title" in onlyDone, false);
assert.equal("priority" in onlyDone, false);
assert.equal("due_at" in onlyDone, false);
assert.equal("source" in onlyDone, false);

const titleAndEnergy = buildTaskPutDbUpdates({
  title: "Hello",
  energyLevel: "high",
});
assert.equal(titleAndEnergy.title, "Hello");
assert.equal(titleAndEnergy.energy_level, "high");
assert.equal("done" in titleAndEnergy, false);

console.log("buildTaskPutDbUpdates: all checks ok");
