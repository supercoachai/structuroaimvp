import { describe, expect, it } from "vitest";

import { CLIENT_FUNNEL_EVENTS } from "./clientFunnelAllowlist";

describe("clientFunnelAllowlist push soft-require", () => {
  it("bevat push opt-in events", () => {
    const required = [
      "push_opt_in_clicked",
      "push_opt_in_success",
      "push_opt_in_denied",
      "push_opt_in_skipped",
      "push_needs_homescreen",
      "push_soft_prompt_shown",
    ];
    for (const name of required) {
      expect(CLIENT_FUNNEL_EVENTS).toContain(name);
    }
  });
});
