/**
 * Run: npx tsx src/lib/jasper/jasperOffer.test.ts
 */
import assert from "node:assert/strict";

import {
  JASPER_OFFER_AMOUNT_OFF_CENTS,
  JASPER_OFFER_DISCOUNTED_AMOUNT_CENTS,
  JASPER_OFFER_DISCOUNTED_MONTHS,
  JASPER_OFFER_REGULAR_AMOUNT_CENTS,
  JASPER_SIGNUP_SOURCE,
  JASPER_TRIAL_DAYS,
  getJasperOffer,
  getJasperStripeCouponId,
  getJasperSubscriptionDiscount,
  isJasperLandingPath,
  isJasperSignupSource,
} from "./jasperOffer";

assert.equal(JASPER_SIGNUP_SOURCE, "jasper_podcast");
assert.equal(JASPER_TRIAL_DAYS, 7);
assert.equal(JASPER_OFFER_DISCOUNTED_MONTHS, 3);
assert.equal(JASPER_OFFER_DISCOUNTED_AMOUNT_CENTS, 799);
assert.equal(JASPER_OFFER_REGULAR_AMOUNT_CENTS, 1299);
assert.equal(JASPER_OFFER_AMOUNT_OFF_CENTS, 500);

assert.equal(isJasperSignupSource("jasper_podcast"), true);
assert.equal(isJasperSignupSource("JASPER_PODCAST"), true);
assert.equal(isJasperSignupSource("Jasper_Podcast"), true);
assert.equal(isJasperSignupSource("jasper"), false);
assert.equal(isJasperSignupSource("tiktok"), false);
assert.equal(isJasperSignupSource(null), false);
assert.equal(isJasperSignupSource(""), false);

assert.equal(isJasperLandingPath("/jasper"), true);
assert.equal(isJasperLandingPath("/jasper/aflevering-3"), true);
assert.equal(isJasperLandingPath("/start"), false);
assert.equal(isJasperLandingPath("/jasperpodcast"), false);
assert.equal(isJasperLandingPath(null), false);
assert.equal(isJasperLandingPath(undefined), false);

const offer = getJasperOffer();
assert.equal(offer.trialDays, 7);
assert.equal(offer.discountedMonths, 3);
assert.ok(
  offer.discountedPrice.includes("7,99"),
  `discountedPrice should mention 7,99, kreeg: ${offer.discountedPrice}`
);
assert.ok(
  offer.regularPrice.includes("12,99"),
  `regularPrice should mention 12,99, kreeg: ${offer.regularPrice}`
);

const origCoupon = process.env.STRIPE_JASPER_COUPON_ID;

delete process.env.STRIPE_JASPER_COUPON_ID;
assert.equal(getJasperStripeCouponId(), null);
assert.equal(getJasperSubscriptionDiscount("jasper_podcast"), null);
assert.equal(getJasperSubscriptionDiscount("tiktok"), null);

process.env.STRIPE_JASPER_COUPON_ID = "  invalid coupon!  ";
assert.equal(
  getJasperStripeCouponId(),
  null,
  "invalide tekens moeten geweigerd worden"
);

process.env.STRIPE_JASPER_COUPON_ID = "jasper_3m_500off";
assert.equal(getJasperStripeCouponId(), "jasper_3m_500off");
assert.deepEqual(getJasperSubscriptionDiscount("jasper_podcast"), [
  { coupon: "jasper_3m_500off" },
]);
assert.equal(
  getJasperSubscriptionDiscount("tiktok"),
  null,
  "niet-jasper-bronnen krijgen geen coupon"
);
assert.equal(
  getJasperSubscriptionDiscount(null),
  null,
  "ontbrekende bron krijgt geen coupon"
);

if (origCoupon === undefined) {
  delete process.env.STRIPE_JASPER_COUPON_ID;
} else {
  process.env.STRIPE_JASPER_COUPON_ID = origCoupon;
}

console.log("jasperOffer.test.ts: ok");
