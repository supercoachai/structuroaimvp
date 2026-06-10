import assert from "node:assert/strict";
import {
  LAST_SEEN_TOUCH_INTERVAL_MS,
  shouldTouchLastSeen,
} from "./lastSeen";

assert.equal(shouldTouchLastSeen(null), true);
assert.equal(shouldTouchLastSeen(undefined), true);

const now = Date.parse("2026-06-10T12:00:00.000Z");
assert.equal(
  shouldTouchLastSeen("2026-06-10T11:00:00.000Z", now),
  true,
  "ouder dan 15 min → touch"
);
assert.equal(
  shouldTouchLastSeen(
    new Date(now - LAST_SEEN_TOUCH_INTERVAL_MS + 1000).toISOString(),
    now
  ),
  false,
  "jonger dan 15 min → skip"
);

console.log("lastSeen.test.ts OK");
