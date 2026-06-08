import assert from "node:assert/strict";
import { isOpenBacklogTask } from "./taskFilters";

assert.equal(
  isOpenBacklogTask({ done: false, notToday: false, source: "regular" }),
  true
);
assert.equal(
  isOpenBacklogTask({ done: true, notToday: false, source: "regular" }),
  false
);
assert.equal(
  isOpenBacklogTask({ done: false, notToday: true, source: "regular" }),
  false
);
assert.equal(
  isOpenBacklogTask({ done: false, notToday: false, source: "medication" }),
  false
);
assert.equal(
  isOpenBacklogTask({ done: false, notToday: false, source: "event" }),
  false
);
assert.equal(
  isOpenBacklogTask({
    done: false,
    notToday: false,
    source: "parked_thought",
  }),
  false
);

console.log("taskFilters.test.ts ok");
