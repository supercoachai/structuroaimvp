/** Live Stripe price IDs (productie, launch 31 mei 2026). */
export const LIVE_STRIPE_PRICE_ID_MONTHLY = "price_1TZpgcV05ARLhkqludSsZ0P5";
export const LIVE_STRIPE_PRICE_ID_YEARLY = "price_1TZpgeV05ARLhkqluF7sX6EZ";

/** Stripe test mode price IDs (zelfde bedragen, sandbox Dashboard). */
export const TEST_STRIPE_PRICE_ID_MONTHLY = "price_1TZr2mV05ARLhkqlu5cYzUNm";
export const TEST_STRIPE_PRICE_ID_YEARLY = "price_1TZr35V05ARLhkqlhSYWzD9F";

/** Server: env override, anders live defaults (productie). */
export const STRIPE_PRICE_ID_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY?.trim() || LIVE_STRIPE_PRICE_ID_MONTHLY;

export const STRIPE_PRICE_ID_YEARLY =
  process.env.STRIPE_PRICE_ID_YEARLY?.trim() || LIVE_STRIPE_PRICE_ID_YEARLY;

/**
 * Client (/registreren): NEXT_PUBLIC_* zodat browser dezelfde IDs stuurt als de server valideert.
 * Lokaal: zet test IDs in .env.local (sk_test_ + test price IDs).
 */
export const CLIENT_STRIPE_PRICE_ID_MONTHLY =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY?.trim() ||
  LIVE_STRIPE_PRICE_ID_MONTHLY;

export const CLIENT_STRIPE_PRICE_ID_YEARLY =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY?.trim() ||
  LIVE_STRIPE_PRICE_ID_YEARLY;

export type RegisterPlanId = "monthly" | "yearly";

export type RegisterPlan = {
  id: RegisterPlanId;
  labelKey: "yearlyTitle" | "monthlyTitle";
  amountKey: "yearlyAmount" | "monthlyAmount";
  periodKey: "yearlyPeriod" | "monthlyPeriod";
  subKey: "yearlySub" | "monthlySub" | "yearlyEffective";
  featureKeys: string[];
  priceId: string;
  highlight: boolean;
  default: boolean;
};

export const REGISTER_PLANS: RegisterPlan[] = [
  {
    id: "monthly",
    labelKey: "monthlyTitle",
    amountKey: "monthlyAmount",
    periodKey: "monthlyPeriod",
    subKey: "monthlySub",
    featureKeys: [
      "monthlyFeat1",
      "monthlyFeat2",
      "monthlyFeat3",
      "monthlyFeat4",
      "monthlyFeat5",
    ],
    priceId: CLIENT_STRIPE_PRICE_ID_MONTHLY,
    highlight: false,
    default: true,
  },
  {
    id: "yearly",
    labelKey: "yearlyTitle",
    amountKey: "yearlyAmount",
    periodKey: "yearlyPeriod",
    subKey: "yearlyEffective",
    featureKeys: [
      "yearlyFeat1",
      "yearlyFeat2",
      "yearlyFeat3",
      "yearlyFeat4",
      "yearlyFeat5",
    ],
    priceId: CLIENT_STRIPE_PRICE_ID_YEARLY,
    highlight: true,
    default: false,
  },
];

const ALLOWED_STRIPE_PRICE_IDS = new Set([
  LIVE_STRIPE_PRICE_ID_MONTHLY,
  LIVE_STRIPE_PRICE_ID_YEARLY,
  TEST_STRIPE_PRICE_ID_MONTHLY,
  TEST_STRIPE_PRICE_ID_YEARLY,
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
  CLIENT_STRIPE_PRICE_ID_MONTHLY,
  CLIENT_STRIPE_PRICE_ID_YEARLY,
]);

export function isAllowedStripePriceId(priceId: string): boolean {
  return ALLOWED_STRIPE_PRICE_IDS.has(priceId);
}

export function planFromStripePriceId(priceId: string): RegisterPlanId | null {
  if (
    priceId === LIVE_STRIPE_PRICE_ID_MONTHLY ||
    priceId === TEST_STRIPE_PRICE_ID_MONTHLY ||
    priceId === STRIPE_PRICE_ID_MONTHLY ||
    priceId === CLIENT_STRIPE_PRICE_ID_MONTHLY
  ) {
    return "monthly";
  }
  if (
    priceId === LIVE_STRIPE_PRICE_ID_YEARLY ||
    priceId === TEST_STRIPE_PRICE_ID_YEARLY ||
    priceId === STRIPE_PRICE_ID_YEARLY ||
    priceId === CLIENT_STRIPE_PRICE_ID_YEARLY
  ) {
    return "yearly";
  }
  return null;
}

export function defaultRegisterPlanId(): RegisterPlanId {
  return "monthly";
}
