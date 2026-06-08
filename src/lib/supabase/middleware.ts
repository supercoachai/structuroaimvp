// Direct server-entry import voorkomt dat browser-client code in Edge-bundel meegetrokken wordt.
import { createServerClient } from "@supabase/ssr/dist/module/createServerClient";
import { NextResponse, type NextRequest } from "next/server";
import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/authStorage";
import {
  STRUCTURO_DAGSTART_COOKIE,
  decodeDagstartCookieValue,
  getCalendarDateAmsterdam,
} from "../dagstartCookie";
import { LOCAL_ONBOARDING_DONE_COOKIE } from "../localOnboardingCookie";
import { isDagstartNodig } from "../checkDagstart";
import { isProfileOnboardingUpToDate } from "../onboardingVersion";
import { profileHasAppAccessOrGrace } from "../subscriptionAccess";
import {
  preOnboardingPath,
  requiresPaidSubscriptionBeforeOnboarding,
} from "../registrationGate";
import { isProtectedTestAccount } from "../protectedTestAccount";
import { PRIVACY_SETUP_DONE_COOKIE } from "../privacySetup";
import {
  isRegistrationAppRoute,
  isRegistrationCheckoutApiRoute,
  isRegistrationCheckoutEnabled,
} from "../stripe/registrationLaunch";
import {
  ADHD_CAFE_SIGNUP_CAMPAIGN,
  ADHD_CAFE_SIGNUP_SOURCE,
} from "../stripe/trialConfig";

/**
 * Abonnements-check in middleware. Standaard UIT (geen redirect naar /abonnement).
 * Zet op productie STRUCTURO_MIDDLEWARE_PAYWALL=1 wanneer Stripe live is én bestaande gebruikers
 * een grace-period hebben gekregen.
 */
function isMiddlewareSubscriptionPaywallEnabled(): boolean {
  return process.env.STRUCTURO_MIDDLEWARE_PAYWALL === "1";
}

/** Routes die zichtbaar zijn zonder betaald abonnement (na onboarding). */
function canAccessWithoutActiveSubscription(pathname: string): boolean {
  // API-routes nooit paywallen: ze hebben hun eigen auth en moeten een JSON-respons
  // kunnen geven (anders breekt bijv. fetch('/api/account/delete') op een 307 naar /abonnement).
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/registreren" || pathname.startsWith("/registreren/")) return true;
  if (pathname === "/welkom" || pathname.startsWith("/welkom/")) return true;
  if (pathname === "/consent" || pathname.startsWith("/consent/")) return true;
  if (isAnonymousPublicPage(pathname)) return true;
  if (pathname === "/abonnement" || pathname.startsWith("/abonnement/")) return true;
  if (pathname === "/privacy" || pathname.startsWith("/privacy/")) return true;
  if (pathname === "/terms" || pathname.startsWith("/terms/")) return true;
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  if (pathname.startsWith("/api/stripe/checkout")) return true;
  if (pathname.startsWith("/api/checkout/create-session")) return true;
  return false;
}

/** Publieke API-routes (geen login, geen redirect). */
function isPublicApiRoute(pathname: string): boolean {
  if (
    process.env.NODE_ENV === "development" &&
    pathname.startsWith("/api/dev/")
  ) {
    return true;
  }
  return (
    pathname.startsWith("/api/waitlist/join") ||
    pathname.startsWith("/api/analytics/waitlist-conversion") ||
    pathname.startsWith("/api/checkout/session-status") ||
    pathname.startsWith("/api/checkout/resume-session") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stripe/checkout") ||
    pathname.startsWith("/api/checkout/create-session")
  );
}

/** Routes zonder sessie die geen redirect naar login krijgen (legal, launch-wachtlijst). */
function isAnonymousPublicPage(pathname: string): boolean {
  if (
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/")
  ) {
    return true;
  }
  return (
    pathname === "/wachtlijst" ||
    pathname.startsWith("/wachtlijst/") ||
    pathname === "/inschrijven" ||
    pathname.startsWith("/inschrijven/") ||
    pathname === "/registreren" ||
    pathname.startsWith("/registreren/") ||
    pathname === "/welkom" ||
    pathname.startsWith("/welkom/") ||
    pathname === "/adhd-cafe" ||
    pathname.startsWith("/adhd-cafe/")
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.replace(/^https:\/\//, "").split(".")[0];
  const legacyName = projectRef ? `sb-${projectRef}-auth-token` : null;
  const all = request.cookies.getAll();
  return all.some((c) => {
    if (!c.value) return false;
    if (c.name === STRUCTURO_SUPABASE_AUTH_STORAGE_KEY) return true;
    if (c.name.startsWith(`${STRUCTURO_SUPABASE_AUTH_STORAGE_KEY}.`)) return true;
    if (legacyName && (c.name === legacyName || c.name.startsWith(`${legacyName}.`)))
      return true;
    return false;
  });
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return Boolean(
    url &&
      key &&
      !url.includes("placeholder") &&
      !key.includes("placeholder")
  );
}

function redirectAdhdCafeToRegistreren(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/adhd-cafe" && !pathname.startsWith("/adhd-cafe/")) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = "/registreren";
  url.searchParams.set("source", ADHD_CAFE_SIGNUP_SOURCE);
  url.searchParams.set("utm_campaign", ADHD_CAFE_SIGNUP_CAMPAIGN);
  return NextResponse.redirect(url, 302);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const adhdCafeRedirect = redirectAdhdCafeToRegistreren(request);
  if (adhdCafeRedirect) return adhdCafeRedirect;

  /**
   * PKCE (magic link / wachtwoordherstel): Supabase hangt `?code=` aan de redirect-URL.
   * Als die URL per ongeluk de site root of /login is, stuurde we door naar /login zonder
   * query en ging de code verloren. Dan zie je het inlogscherm met een willekeurig
   * opgeslagen e-mailadres, zonder nieuw-wachtwoord-stap.
   */
  const authExchangeCode = request.nextUrl.searchParams.get("code");
  if (
    authExchangeCode &&
    pathname !== "/auth/callback" &&
    !pathname.startsWith("/auth/callback/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url, 302);
  }

  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 302);
  }

  if (!isRegistrationCheckoutEnabled()) {
    if (isRegistrationAppRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url, 302);
    }
    if (isRegistrationCheckoutApiRoute(pathname)) {
      return NextResponse.json({ error: "not_available" }, { status: 404 });
    }
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/posthog-otel-logs-test") ||
    pathname.startsWith("/api/posthog-error-test") ||
    isPublicApiRoute(pathname) ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next({ request });
  }

  const isLoginPath = pathname.startsWith("/login");
  const isAuthPath = pathname.startsWith("/auth");

  if (!isSupabaseConfigured()) {
    return legacyCookieOnlyMiddleware(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      auth: {
        storageKey: STRUCTURO_SUPABASE_AUTH_STORAGE_KEY,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasLocalMode = Boolean(
    request.cookies.get("structuro_local_mode")?.value
  );

  /**
   * Alleen zonder Supabase-user: anonieme lokale test. Zelfde intro als ingelogde users;
   * voortgang via cookie (middleware leest geen localStorage).
   */
  if (hasLocalMode && !user) {
    if (isLoginPath || isAuthPath || isAnonymousPublicPage(pathname)) {
      return supabaseResponse;
    }
    return applyLocalAnonymousOnboardingGuard(
      request,
      supabaseResponse,
      pathname
    );
  }

  let onboardingCompleted = true;
  let profileLastDagstartDate: string | null | undefined = undefined;
  let profileRowReadOk = false;
  let subscriptionStatus: string | null | undefined;
  let subscriptionPeriodEnd: string | null | undefined;
  let profileCreatedAt: string | null | undefined;
  let profileSignupSource: string | null | undefined;

  if (user) {
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, onboarding_version, last_dagstart_date, subscription_status, subscription_current_period_end, created_at, signup_source"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!profError && prof) {
      profileRowReadOk = true;
      onboardingCompleted = isProfileOnboardingUpToDate(
        prof.onboarding_completed,
        prof.onboarding_version as number | null | undefined
      );
      profileLastDagstartDate =
        prof.last_dagstart_date != null
          ? String(prof.last_dagstart_date).slice(0, 10)
          : null;
      subscriptionStatus =
        typeof prof.subscription_status === "string" ? prof.subscription_status : null;
      subscriptionPeriodEnd =
        typeof prof.subscription_current_period_end === "string"
          ? prof.subscription_current_period_end
          : prof.subscription_current_period_end != null
            ? String(prof.subscription_current_period_end)
            : null;
      profileCreatedAt =
        prof.created_at != null ? String(prof.created_at) : null;
      profileSignupSource =
        typeof prof.signup_source === "string" ? prof.signup_source : null;
    } else {
      onboardingCompleted = false;
    }

    const forceOnboardingDev =
      process.env.NODE_ENV === "development" &&
      process.env.STRUCTURO_DEV_FORCE_ONBOARDING === "1";
    if (forceOnboardingDev) {
      onboardingCompleted = false;
    }
  }

  if (isLoginPath && user) {
    if (!onboardingCompleted) {
      const url = request.nextUrl.clone();
      url.pathname = preOnboardingPath({
        email: user.email ?? null,
        profileRowReadOk,
        subscription_status: subscriptionStatus,
        subscription_current_period_end: subscriptionPeriodEnd,
        created_at: profileCreatedAt,
        signup_source: profileSignupSource,
      });
      return NextResponse.redirect(url, 302);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 302);
  }

  const hasSession = Boolean(user) || hasSupabaseAuthCookie(request);

  if (!hasSession) {
    if (
      process.env.NODE_ENV === "development" &&
      pathname.startsWith("/welkom/install") &&
      (request.nextUrl.searchParams.get("previewInstall") === "1" ||
        request.nextUrl.searchParams.get("from") === "consent" ||
        request.nextUrl.searchParams.get("from") === "settings")
    ) {
      return supabaseResponse;
    }
    if (
      isLoginPath ||
      isAuthPath ||
      isAnonymousPublicPage(pathname) ||
      isPublicApiRoute(pathname) ||
      pathname.startsWith("/api/")
    ) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/welkom/install")
    ) {
      url.searchParams.set("next", "/onboarding");
    }
    return NextResponse.redirect(url, 302);
  }

  /** Sessie-cookie maar user nog niet gehydrateerd: niet blokkeren. */
  if (!user) {
    return applyDagstartCookieGuard(request, supabaseResponse, pathname);
  }

  if (!onboardingCompleted) {
    const onPasswordRecovery =
      pathname === "/auth/wachtwoord-instellen" ||
      pathname.startsWith("/auth/wachtwoord-instellen/");
    const onRegistrationFlow =
      isRegistrationCheckoutEnabled() && isRegistrationAppRoute(pathname);
    const payBeforeOnboarding = requiresPaidSubscriptionBeforeOnboarding({
      email: user.email ?? null,
      profileRowReadOk,
      subscription_status: subscriptionStatus,
      subscription_current_period_end: subscriptionPeriodEnd,
      created_at: profileCreatedAt,
      signup_source: profileSignupSource,
    });

    if (pathname.startsWith("/onboarding") && payBeforeOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/registreren/plan";
      return NextResponse.redirect(url, 302);
    }

    if (
      !pathname.startsWith("/onboarding") &&
      !onPasswordRecovery &&
      !onRegistrationFlow
    ) {
      const url = request.nextUrl.clone();
      url.pathname = payBeforeOnboarding ? "/registreren/plan" : "/onboarding";
      return NextResponse.redirect(url, 302);
    }
    return supabaseResponse;
  }

  const privacySetupDone =
    request.cookies.get(PRIVACY_SETUP_DONE_COOKIE)?.value === "1";

  if (onboardingCompleted && !privacySetupDone) {
    const onConsentPath =
      pathname === "/consent" || pathname.startsWith("/consent/");
    if (
      !onConsentPath &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/privacy") &&
      !pathname.startsWith("/terms")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      return NextResponse.redirect(url, 302);
    }
  }

  if (pathname.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = privacySetupDone ? "/" : "/consent";
    return NextResponse.redirect(url, 302);
  }

  if (user && onboardingCompleted && profileRowReadOk) {
    const skipPaidGate =
      !isMiddlewareSubscriptionPaywallEnabled() ||
      process.env.STRUCTURO_DEV_SKIP_SUBSCRIPTION === "1" ||
      isProtectedTestAccount(user.email ?? null) ||
      canAccessWithoutActiveSubscription(pathname);
    if (!skipPaidGate) {
      const ok = profileHasAppAccessOrGrace({
        subscription_status: subscriptionStatus,
        subscription_current_period_end: subscriptionPeriodEnd,
        created_at: profileCreatedAt,
        last_dagstart_date: profileLastDagstartDate,
        signup_source: profileSignupSource,
      });
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/abonnement";
        return NextResponse.redirect(url, 302);
      }
    }
  }

  if (user && profileRowReadOk) {
    return applyDagstartDbGate(
      request,
      supabaseResponse,
      pathname,
      profileLastDagstartDate ?? null
    );
  }

  return applyDagstartCookieGuard(request, supabaseResponse, pathname);
}

/** Bron: profiles.last_dagstart_date (Amsterdam-kalenderdag). Cookie wordt gesynchroniseerd als DB vandaag al klaar is. */
function applyDagstartDbGate(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  lastDagstartDate: string | null
): NextResponse {
  const needsDagstartPath =
    !pathname.startsWith("/dagstart") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/registreren") &&
    !pathname.startsWith("/welkom") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/consent") &&
    !pathname.startsWith("/abonnement") &&
    !pathname.startsWith("/privacy") &&
    !pathname.startsWith("/terms") &&
    !pathname.startsWith("/api");

  if (!needsDagstartPath) {
    return response;
  }

  const today = getCalendarDateAmsterdam();
  const dbYmd =
    lastDagstartDate && lastDagstartDate.length >= 10
      ? lastDagstartDate.slice(0, 10)
      : null;

  if (dbYmd === today) {
    const raw = request.cookies.get(STRUCTURO_DAGSTART_COOKIE)?.value;
    if (decodeDagstartCookieValue(raw) !== today) {
      response.cookies.set(STRUCTURO_DAGSTART_COOKIE, encodeURIComponent(today), {
        path: "/",
        maxAge: 172800,
        sameSite: "lax",
      });
    }
    return response;
  }

  if (!isDagstartNodig(dbYmd)) {
    return response;
  }

  return response;
}

/** Lokale test zonder account: verplichte /onboarding tot cookie gezet is. */
function applyLocalAnonymousOnboardingGuard(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): NextResponse {
  const isLoginPath = pathname.startsWith("/login");
  const isAuthPath = pathname.startsWith("/auth");

  if (isLoginPath || isAuthPath || isAnonymousPublicPage(pathname)) {
    return response;
  }

  const localObRaw =
    request.cookies.get(LOCAL_ONBOARDING_DONE_COOKIE)?.value;
  const localOnboardingDone = localObRaw === "2";
  const privacySetupDone =
    request.cookies.get(PRIVACY_SETUP_DONE_COOKIE)?.value === "1";

  if (
    !localOnboardingDone &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url, 302);
  }

  if (localOnboardingDone && !privacySetupDone) {
    const onConsentPath =
      pathname === "/consent" || pathname.startsWith("/consent/");
    if (
      !onConsentPath &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/privacy") &&
      !pathname.startsWith("/terms")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      return NextResponse.redirect(url, 302);
    }
  }

  if (
    localOnboardingDone &&
    pathname.startsWith("/onboarding")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = privacySetupDone ? "/" : "/consent";
    return NextResponse.redirect(url, 302);
  }

  return applyDagstartCookieGuard(request, response, pathname);
}

function applyDagstartCookieGuard(
  _request: NextRequest,
  response: NextResponse,
  _pathname: string
): NextResponse {
  return response;
}

function legacyCookieOnlyMiddleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 302);
  }

  if (!isRegistrationCheckoutEnabled()) {
    if (isRegistrationAppRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url, 302);
    }
    if (isRegistrationCheckoutApiRoute(pathname)) {
      return NextResponse.json({ error: "not_available" }, { status: 404 });
    }
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    isAnonymousPublicPage(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/posthog-otel-logs-test") ||
    pathname.startsWith("/api/posthog-error-test") ||
    isPublicApiRoute(pathname) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next({ request });
  }

  const localModeCookie = request.cookies.get("structuro_local_mode")?.value;
  const hasAuth = hasSupabaseAuthCookie(request);

  if (!hasAuth && !localModeCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url, 302);
  }

  if (localModeCookie && !hasAuth) {
    return applyLocalAnonymousOnboardingGuard(
      request,
      NextResponse.next({ request }),
      pathname
    );
  }

  return applyDagstartCookieGuard(
    request,
    NextResponse.next({ request }),
    pathname
  );
}
