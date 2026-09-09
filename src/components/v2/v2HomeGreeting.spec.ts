import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatV2HomeGreeting,
  peekLocalV2GreetingName,
  resolveV2GreetingFirstName,
} from "./v2HomeGreeting";

function installStorage() {
  const local = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => {
      local.set(k, String(v));
    },
    removeItem: (k: string) => {
      local.delete(k);
    },
    clear: () => local.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
  return { localStorage };
}

describe("formatV2HomeGreeting", () => {
  it("zet een komma en voornaam achter het groetwoord", () => {
    expect(formatV2HomeGreeting("Goedemiddag", "Niels")).toBe(
      "Goedemiddag, Niels",
    );
    expect(formatV2HomeGreeting("Good afternoon", "Niels")).toBe(
      "Good afternoon, Niels",
    );
  });

  it("gebruikt alleen de voornaam bij een volledige naam", () => {
    expect(formatV2HomeGreeting("Goedemiddag", "Niels van den Hurk")).toBe(
      "Goedemiddag, Niels",
    );
  });

  it("laat het groetwoord staan zonder naam", () => {
    expect(formatV2HomeGreeting("Goedemiddag", "")).toBe("Goedemiddag");
    expect(formatV2HomeGreeting("Goedemorgen", "   ")).toBe("Goedemorgen");
    expect(formatV2HomeGreeting("Goedenavond", null)).toBe("Goedenavond");
    expect(formatV2HomeGreeting("Goedenacht")).toBe("Goedenacht");
  });

  it("slaat placeholder-namen over", () => {
    expect(formatV2HomeGreeting("Goedemiddag", "Gebruiker")).toBe("Goedemiddag");
    expect(formatV2HomeGreeting("Goedemiddag", "Jij")).toBe("Goedemiddag");
    expect(formatV2HomeGreeting("Good afternoon", "You")).toBe("Good afternoon");
    expect(formatV2HomeGreeting("Goedemiddag", "User")).toBe("Goedemiddag");
    expect(formatV2HomeGreeting("Goedemiddag", "A")).toBe("Goedemiddag");
  });
});

describe("resolveV2GreetingFirstName", () => {
  it("pakt de eerste betekenisvolle kandidaat", () => {
    expect(resolveV2GreetingFirstName("Niels", "Sam")).toBe("Niels");
    expect(resolveV2GreetingFirstName("", "Niels")).toBe("Niels");
    expect(resolveV2GreetingFirstName("Gebruiker", "Niels")).toBe("Niels");
    expect(resolveV2GreetingFirstName("You", "  ", "Mira")).toBe("Mira");
    expect(resolveV2GreetingFirstName("", null, undefined)).toBe("");
  });
});

describe("peekLocalV2GreetingName", () => {
  beforeEach(() => {
    installStorage();
  });

  it("leest structuro_user_name", () => {
    localStorage.setItem("structuro_user_name", "Niels");
    expect(peekLocalV2GreetingName()).toBe("Niels");
  });

  it("leest v2_journey.name als localStorage-naam ontbreekt", () => {
    localStorage.setItem("v2_journey", JSON.stringify({ name: "Mira" }));
    expect(peekLocalV2GreetingName()).toBe("Mira");
  });

  it("slaat placeholders in lokale bronnen over", () => {
    localStorage.setItem("structuro_user_name", "Gebruiker");
    localStorage.setItem("v2_journey", JSON.stringify({ name: "Niels" }));
    expect(peekLocalV2GreetingName()).toBe("Niels");
  });
});
