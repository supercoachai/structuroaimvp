/**
 * Publieke registratie + Stripe-checkout (structuro.ai/registreren, /abonnement, …).
 *
 * Productie: standaard UIT. Bij launch: STRUCTURO_PUBLIC_REGISTRATION=1 en
 * NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=1 in Vercel.
 *
 * Lokaal: aan tenzij expliciet STRUCTURO_PUBLIC_REGISTRATION=0 (server) of
 * NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=0 (client).
 */

export function isRegistrationCheckoutEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return process.env.STRUCTURO_PUBLIC_REGISTRATION !== "0";
  }
  return process.env.STRUCTURO_PUBLIC_REGISTRATION === "1";
}

/** Client-side (settings, registreren-pagina's). */
export function isRegistrationCheckoutEnabledClient(): boolean {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION !== "0";
  }
  return process.env.NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION === "1";
}

export function isRegistrationAppRoute(pathname: string): boolean {
  return (
    pathname === "/registreren" ||
    pathname.startsWith("/registreren/") ||
    pathname === "/welkom" ||
    pathname.startsWith("/welkom/") ||
    pathname === "/abonnement" ||
    pathname.startsWith("/abonnement/") ||
    pathname === "/checkout-success" ||
    pathname.startsWith("/checkout-success/")
  );
}

export function isRegistrationCheckoutApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/checkout/create-session") ||
    pathname === "/api/stripe/checkout" ||
    pathname.startsWith("/api/stripe/checkout/")
  );
}
