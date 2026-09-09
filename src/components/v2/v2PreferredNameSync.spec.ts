import { describe, expect, it } from "vitest";

import { resolveHydratedPreferredName } from "./v2PreferredNameSync";

describe("resolveHydratedPreferredName", () => {
  it("kiest de cloudnaam als die betekenisvol is", () => {
    expect(resolveHydratedPreferredName("Niels van den Hurk", "Sam")).toEqual({
      name: "Niels van den Hurk",
      shouldPushToCloud: false,
    });
  });

  it("schrijft de journey-naam terug als het profiel leeg is", () => {
    expect(resolveHydratedPreferredName("", "Sam")).toEqual({
      name: "Sam",
      shouldPushToCloud: true,
    });
  });

  it("negeert placeholders in de cloud", () => {
    expect(resolveHydratedPreferredName("Gebruiker", "Mira")).toEqual({
      name: "Mira",
      shouldPushToCloud: true,
    });
  });

  it("neemt geen restant-localStorage over zonder journey-naam", () => {
    expect(resolveHydratedPreferredName("", "")).toEqual({
      name: "",
      shouldPushToCloud: false,
    });
  });
});
