/**
 * Run: npx tsx src/lib/registrationGate.test.ts
 */
import assert from "node:assert/strict";
import {
  canAccessOnboardingWithoutCheckout,
  preOnboardingPath,
  requiresPaidSubscriptionBeforeOnboarding,
} from "./registrationGate";

const origNodeEnv = process.env.NODE_ENV;
const origPublicReg = process.env.STRUCTURO_PUBLIC_REGISTRATION;
const origProtectedEmail = process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL;

function withEnv(
  nodeEnv: string,
  publicReg: string | undefined,
  fn: () => void
) {
  process.env.NODE_ENV = nodeEnv;
  if (publicReg === undefined) {
    delete process.env.STRUCTURO_PUBLIC_REGISTRATION;
  } else {
    process.env.STRUCTURO_PUBLIC_REGISTRATION = publicReg;
  }
  try {
    fn();
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origPublicReg === undefined) {
      delete process.env.STRUCTURO_PUBLIC_REGISTRATION;
    } else {
      process.env.STRUCTURO_PUBLIC_REGISTRATION = origPublicReg;
    }
  }
}

const unpaidProfile = {
  email: "new@example.com",
  profileRowReadOk: true,
  subscription_status: null as string | null,
  subscription_current_period_end: null as string | null,
};

const paidProfile = {
  ...unpaidProfile,
  subscription_status: "active",
};

{
  withEnv("development", "1", () => {
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(unpaidProfile), false);
    assert.equal(preOnboardingPath(unpaidProfile), "/onboarding");
  });
}

{
  withEnv("production", "1", () => {
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(unpaidProfile), true);
    assert.equal(preOnboardingPath(unpaidProfile), "/registreren/plan");
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(paidProfile), false);
    assert.equal(preOnboardingPath(paidProfile), "/onboarding");

    const stripeTrialProfile = {
      ...unpaidProfile,
      subscription_status: "trialing",
      subscription_current_period_end: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(stripeTrialProfile), false);
    assert.equal(preOnboardingPath(stripeTrialProfile), "/onboarding");

    const trialProfile = {
      ...unpaidProfile,
      created_at: new Date().toISOString(),
    };
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(trialProfile), false);
    assert.equal(preOnboardingPath(trialProfile), "/onboarding");

    const expiredTrialProfile = {
      ...unpaidProfile,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    };
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(expiredTrialProfile), true);
    assert.equal(preOnboardingPath(expiredTrialProfile), "/registreren/plan");
  });
}

{
  process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL = "test@structuro.ai";
  withEnv("production", "1", () => {
    assert.equal(
      requiresPaidSubscriptionBeforeOnboarding({
        ...unpaidProfile,
        email: "test@structuro.ai",
      }),
      false
    );
  });
  if (origProtectedEmail === undefined) {
    delete process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL;
  } else {
    process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL = origProtectedEmail;
  }
}

{
  withEnv("production", "1", () => {
    const cafeProfile = {
      ...unpaidProfile,
      signup_source: "adhd_cafe",
    };
    assert.equal(requiresPaidSubscriptionBeforeOnboarding(cafeProfile), false);
    assert.equal(preOnboardingPath(cafeProfile), "/onboarding");
  });
}

{
  withEnv("production", "1", () => {
    assert.equal(
      canAccessOnboardingWithoutCheckout({ replayQuery: true }),
      true
    );
    assert.equal(
      canAccessOnboardingWithoutCheckout({ privacySetupDone: true }),
      true
    );
    assert.equal(
      canAccessOnboardingWithoutCheckout({ lastDagstartDate: "2026-06-01" }),
      true
    );
    assert.equal(canAccessOnboardingWithoutCheckout({}), false);
  });
}

console.log("registrationGate.test.ts: ok");
