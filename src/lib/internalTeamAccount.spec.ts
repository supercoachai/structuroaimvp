import { describe, expect, it } from "vitest";

import {
  isInternalTeamAccount,
  resolvePathForInternalTeam,
} from "./internalTeamAccount";

describe("internalTeamAccount", () => {
  it("herkent info@structuro.eu als intern", () => {
    expect(isInternalTeamAccount("info@structuro.eu")).toBe(true);
    expect(isInternalTeamAccount("INFO@structuro.eu")).toBe(true);
    expect(isInternalTeamAccount("niels@example.com")).toBe(false);
  });

  it("stuurt intern team weg van /abonnement naar home", () => {
    expect(resolvePathForInternalTeam("info@structuro.eu", "/abonnement")).toBe(
      "/"
    );
    expect(
      resolvePathForInternalTeam("info@structuro.eu", "/abonnement?start_trial=1")
    ).toBe("/");
    expect(resolvePathForInternalTeam("info@structuro.eu", "/todo")).toBe(
      "/todo"
    );
    expect(resolvePathForInternalTeam("niels@example.com", "/abonnement")).toBe(
      "/abonnement"
    );
  });
});
