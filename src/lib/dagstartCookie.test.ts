import assert from "node:assert/strict";
import {
  getCalendarDateAmsterdam,
  getClockHourAmsterdam,
  getDayOfYearAmsterdam,
} from "./dagstartCookie";

// Winter (CET): 22:00 UTC = 23:00 Amsterdam, zelfde kalenderdag
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-01-15T22:00:00.000Z")),
  "2026-01-15"
);
assert.equal(
  getClockHourAmsterdam(new Date("2026-01-15T22:00:00.000Z")),
  23
);

// Winter: 23:00 UTC = 00:00 Amsterdam volgende dag
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-01-15T23:00:00.000Z")),
  "2026-01-16"
);
assert.equal(
  getClockHourAmsterdam(new Date("2026-01-15T23:00:00.000Z")),
  0
);

// Zomer (CEST): 21:00 UTC = 23:00 Amsterdam
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-07-15T21:00:00.000Z")),
  "2026-07-15"
);

// Zomer: 22:00 UTC = 00:00 Amsterdam volgende dag
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-07-15T22:00:00.000Z")),
  "2026-07-16"
);

// DST-overgang voorjaar (29 mrt 2026): 01:30 Amsterdam = nog wintertijd
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-03-29T00:30:00.000Z")),
  "2026-03-29"
);

// Na klok spring-forward: 03:30 Amsterdam op dezelfde kalenderdag
assert.equal(
  getCalendarDateAmsterdam(new Date("2026-03-29T01:30:00.000Z")),
  "2026-03-29"
);

// Dag van het jaar (UTC-onafhankelijk via Amsterdam-kalender)
assert.equal(
  getDayOfYearAmsterdam(new Date("2026-01-01T12:00:00.000Z")),
  1
);
assert.equal(
  getDayOfYearAmsterdam(new Date("2026-12-31T12:00:00.000Z")),
  365
);

console.log("dagstartCookie.test.ts OK");
