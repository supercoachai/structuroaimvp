import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bounceGuestFromNamePhase,
  clearV2OnboardingUiPhase,
  peekV2OnboardingUiPhase,
  persistV2OnboardingUiPhase,
  shouldSkipFreshStartEnergyReset,
  V2_ONBOARDING_UI_PHASE_KEY,
} from "./v2OnboardingPhaseGate";
import {
  markV2PostAccountNamePending,
  peekV2PostAccountNamePending,
  V2_POST_ACCOUNT_NAME_FLAG,
} from "./v2PostAccountName";

function installStorage() {
  const session = new Map<string, string>();
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
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", { sessionStorage });
  return sessionStorage;
}

describe("v2OnboardingPhaseGate", () => {
  beforeEach(() => {
    installStorage();
  });

  it("persist / peek / clear account en name", () => {
    expect(peekV2OnboardingUiPhase()).toBeNull();
    persistV2OnboardingUiPhase("account");
    expect(peekV2OnboardingUiPhase()).toBe("account");
    expect(sessionStorage.getItem(V2_ONBOARDING_UI_PHASE_KEY)).toBe("account");
    persistV2OnboardingUiPhase("name");
    expect(peekV2OnboardingUiPhase()).toBe("name");
    clearV2OnboardingUiPhase();
    expect(peekV2OnboardingUiPhase()).toBeNull();
  });

  it("skipt fresh-start reset tijdens account/name of name-pending", () => {
    expect(shouldSkipFreshStartEnergyReset()).toBe(false);
    persistV2OnboardingUiPhase("account");
    expect(shouldSkipFreshStartEnergyReset()).toBe(true);
    clearV2OnboardingUiPhase();
    markV2PostAccountNamePending();
    expect(sessionStorage.getItem(V2_POST_ACCOUNT_NAME_FLAG)).toBe("1");
    expect(shouldSkipFreshStartEnergyReset()).toBe(true);
  });

  it("stuurt een guest zonder sessie van de naamstap terug naar account", () => {
    // Simuleert een afgebroken Google-login: naam-pending vlag staat nog,
    // maar er is nooit een sessie tot stand gekomen.
    markV2PostAccountNamePending();
    persistV2OnboardingUiPhase("name");

    bounceGuestFromNamePhase();

    expect(peekV2PostAccountNamePending()).toBe(false);
    expect(peekV2OnboardingUiPhase()).toBe("account");
  });
});
