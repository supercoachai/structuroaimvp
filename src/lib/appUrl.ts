/**
 * Basis-URL voor Stripe-redirects (Checkout, Billing Portal).
 * Zet NEXT_PUBLIC_APP_URL in productie (bijv. https://www.structuro.ai).
 */
export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
