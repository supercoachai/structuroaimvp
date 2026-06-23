import { describe, expect, it } from "vitest";

import { parseActivationFunnelPayload } from "./parseActivationFunnelPayload";

const VISITOR_ID = "019ef600-b4cf-70b2-b5b8-a8960f546dbb";

describe("parseActivationFunnelPayload", () => {
  it("accepteert onboarding_started", () => {
    const parsed = parseActivationFunnelPayload({
      event: "onboarding_started",
      visitor_id: VISITOR_ID,
      signup_source: "tiktok",
      is_tiktok: true,
    });
    expect(parsed?.event).toBe("onboarding_started");
    expect(parsed?.payload.signup_source).toBe("tiktok");
  });

  it("vereist energy_level voor dagstart_completed", () => {
    expect(
      parseActivationFunnelPayload({
        event: "dagstart_completed",
        visitor_id: VISITOR_ID,
        tasks_selected_count: 1,
      })
    ).toBeNull();
  });

  it("accepteert dagstart_completed met energy", () => {
    const parsed = parseActivationFunnelPayload({
      event: "dagstart_completed",
      visitor_id: VISITOR_ID,
      energy_level: "low",
      tasks_selected_count: 1,
      source: "onboarding",
    });
    expect(parsed?.payload.energy_level).toBe("low");
    expect(parsed?.payload.tasks_selected_count).toBe(1);
  });
});
