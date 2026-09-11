import { describe, expect, it } from "vitest";

import { isExpectedServerActionError } from "./filterServerRequestErrors";

describe("isExpectedServerActionError", () => {
  it("drops the stale server action error", () => {
    expect(
      isExpectedServerActionError(
        new Error(
          'Failed to find Server Action "abc123". This request might be from an older or newer deployment.'
        )
      )
    ).toBe(true);
  });

  it("matches a non-Error throw with the same message", () => {
    expect(
      isExpectedServerActionError(
        "Failed to find Server Action. This request might be from an older or newer deployment."
      )
    ).toBe(true);
  });

  it("keeps genuine app errors", () => {
    expect(
      isExpectedServerActionError(
        new Error("TypeError: Cannot read properties of undefined")
      )
    ).toBe(false);
  });
});
