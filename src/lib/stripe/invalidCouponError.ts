/**
 * Herkent de Stripe-fout voor een niet-bestaande of ongeldige coupon, zoals
 * "No such coupon: 'x'; a similar object exists in test mode...". Deze fout
 * mag nooit een hele checkout blokkeren: de aanroeper hoort terug te vallen
 * op een checkout zonder korting (zie inbox-rapport 019f2afa).
 */
export function isStripeInvalidCouponError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: unknown;
    param?: unknown;
    message?: unknown;
  };
  const param = typeof e.param === "string" ? e.param : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  if (message.includes("no such coupon")) return true;
  if (e.code === "resource_missing" && param.includes("coupon")) return true;
  if (e.code === "coupon_expired") return true;
  return false;
}
