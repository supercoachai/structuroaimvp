import { beforeEach, describe, expect, it, vi } from "vitest";

import { V2_SETTINGS_KEY, v2SettingsDefaults } from "./v2Settings";
import {
  consumeV2PostAccountNamePending,
  dismissV2PostAccountNamePrompt,
  firstNameFromDisplay,
  isMeaningfulPreferredName,
  markV2PostAccountNamePending,
  peekV2PostAccountNamePending,
  prefillNameFromUserMetadata,
  shouldShowV2PostAccountNamePrompt,
  V2_POST_ACCOUNT_NAME_FLAG,
} from "./v2PostAccountName";

function installStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
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
  const sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, String(v));
    },
    removeItem: (k: string) => {
      session.delete(k);
    },
    clear: () => session.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", { localStorage, sessionStorage });
  return { localStorage, sessionStorage };
}

describe("v2PostAccountName", () => {
  beforeEach(() => {
    installStorage();
  });

  it("herkent betekenisvolle voornamen en placeholders", () => {
    expect(isMeaningfulPreferredName("Niels")).toBe(true);
    expect(isMeaningfulPreferredName("Jij")).toBe(false);
    expect(isMeaningfulPreferredName("You")).toBe(false);
    expect(isMeaningfulPreferredName("a")).toBe(false);
    expect(firstNameFromDisplay("Niels van den Hurk")).toBe("Niels");
    expect(firstNameFromDisplay("Gebruiker")).toBe("");
  });

  it("prefill uit Google metadata (given_name / full_name)", () => {
    expect(
      prefillNameFromUserMetadata({ given_name: "Sam", full_name: "Sam Jones" }),
    ).toBe("Sam");
    expect(prefillNameFromUserMetadata({ full_name: "Alex Rivera" })).toBe(
      "Alex",
    );
    expect(prefillNameFromUserMetadata({ full_name: "Jij" })).toBe("");
  });

  it("session flag mark / peek / consume", () => {
    expect(peekV2PostAccountNamePending()).toBe(false);
    markV2PostAccountNamePending();
    expect(peekV2PostAccountNamePending()).toBe(true);
    expect(sessionStorage.getItem(V2_POST_ACCOUNT_NAME_FLAG)).toBe("1");
    expect(consumeV2PostAccountNamePending()).toBe(true);
    expect(peekV2PostAccountNamePending()).toBe(false);
  });

  it("toont prompt wanneer er nog geen preferred naam is", () => {
    expect(shouldShowV2PostAccountNamePrompt()).toBe(true);
  });

  it("skipt wanneer profile preferred_name al staat", () => {
    expect(
      shouldShowV2PostAccountNamePrompt({ profilePreferredName: "Sam" }),
    ).toBe(false);
  });

  it("skipt na dismiss", () => {
    dismissV2PostAccountNamePrompt();
    expect(shouldShowV2PostAccountNamePrompt()).toBe(false);
    const raw = localStorage.getItem(V2_SETTINGS_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).postAccountNamePromptDismissed).toBe(true);
  });

  it("skipt bij bestaande localStorage-naam", () => {
    localStorage.setItem("structuro_user_name", "Niels");
    expect(shouldShowV2PostAccountNamePrompt()).toBe(false);
  });

  it("houdt defaults zonder postAccountNamePromptDismissed", () => {
    localStorage.setItem(
      V2_SETTINGS_KEY,
      JSON.stringify({ ...v2SettingsDefaults }),
    );
    expect(shouldShowV2PostAccountNamePrompt()).toBe(true);
  });
});
