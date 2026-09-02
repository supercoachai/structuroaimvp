import { describe, expect, it } from "vitest";

import { parseClientFunnelPayload } from "./parseClientFunnelPayload";

const VISITOR_ID = "019ef600-b4cf-70b2-b5b8-a8960f546dbb";

describe("parseClientFunnelPayload", () => {
  it("accepteert allowlisted event met properties", () => {
    const parsed = parseClientFunnelPayload({
      event: "onboarding_step",
      visitor_id: VISITOR_ID,
      properties: { step: "energy", source: "app" },
    });
    expect(parsed?.event).toBe("onboarding_step");
    expect(parsed?.payload.properties?.step).toBe("energy");
  });

  it("weigert onbekend event", () => {
    expect(
      parseClientFunnelPayload({
        event: "not_a_real_event",
        visitor_id: VISITOR_ID,
      })
    ).toBeNull();
  });

  it("weigert ongeldige visitor_id", () => {
    expect(
      parseClientFunnelPayload({
        event: "focus_session_started",
        visitor_id: "nope",
      })
    ).toBeNull();
  });

  it("stript taaktitels uit task_id", () => {
    const parsed = parseClientFunnelPayload({
      event: "focus_session_started",
      visitor_id: VISITOR_ID,
      properties: { task_id: "Mail beantwoorden", surface: "app" },
    });
    expect(parsed?.payload.properties?.task_id).toBeUndefined();
    expect(parsed?.payload.properties?.surface).toBe("app");
  });

  it("behoudt interne task ids", () => {
    const parsed = parseClientFunnelPayload({
      event: "focus_session_started",
      visitor_id: VISITOR_ID,
      properties: { task_id: "v2t-lmf8abc-1" },
    });
    expect(parsed?.payload.properties?.task_id).toBe("v2t-lmf8abc-1");
  });
});
