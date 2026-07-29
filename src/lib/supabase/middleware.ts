// Direct server-entry import voorkomt dat browser-client code in Edge-bundel meegetrokken wordt.
import { createServerClient } from "@supabase/ssr/dist/module/createServerClient";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/authStorage";
import {
  STRUCTURO_DAGSTART_COOKIE,
  decodeDagstartCookieValue,
  getCalendarDateAmsterdam,
} from "../dagstartCookie";
import { LOCAL_ONBOARDING_DONE_COOKIE } from "../localOnboardingCookie";
import { isProfileOnboardingUpToDate } from "../onboardingVersion";
import { profileHasAppAccessOrGrace } from "../subscriptionAccess";
import {
  isV2CardTrialCohort,
} from "../stripe/v2CardTrial";
import {
  preOnboardingPath,
  canAccessOnboardingWithoutCheckout,
  requiresPaidSubscriptionBeforeOnboarding,
} from "../registrationGate";
import { isProtectedTestAccount } from "../protectedTestAccount";
import { isInternalTeamAccount } from "../internalTeamAccount";
import { isPasswordRecoverySetupPath } from "../auth/passwordResetRedirect";
import {
  isPasswordCreatePath,
  PASSWORD_CREATE_PATH,
} from "../auth/passwordSetupProfile";
import {
  shouldTouchLastSeen,
  touchProfileLastSeenAt,
} from "../activity/lastSeen";
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
import {
  isV2LabPath,
  isV2LockdownExemptPath,
  isV2PublicEnabled,
  resolveLiveHomePath,
  resolveLivePaywallPath,
  resolveV2LockdownBouncePath,
} from "../v2/v2LabAccess";
import { mapLegacyV2PathToLive, isV2LiveShellPath } from "../v2/livePaths";
import {
  isDagstartGateExemptPath,
  isV2AppShellDagstartPath,
  shouldRedirectToDagstart,
} from "../dagstart/dagstartGate";

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
  if (pathname === "/stop-abonnement" || pathname.startsWith("/stop-abonnement/"))
    return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/registreren" || pathname.startsWith("/registreren/")) return true;
  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) return true;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return true;
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
    pathname.startsWith("/api/analytics/acquisition-landing") ||
    pathname.startsWith("/api/analytics/acquisition-signup-started") ||
    pathname.startsWith("/api/analytics/acquisition-cta-clicked") ||
    pathname.startsWith("/api/analytics/activation-funnel") ||
    pathname.startsWith("/api/checkout/session-status") ||
    pathname.startsWith("/api/checkout/bind-session") ||
    pathname.startsWith("/api/checkout/resume-session") ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stripe/checkout") ||
    pathname.startsWith("/api/checkout/create-session") ||
    pathname.startsWith("/api/cron/expire-trials") ||
    pathname.startsWith("/api/auth/request-password-reset")
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
    pathname === "/activiteit/admin" ||
    pathname.startsWith("/activiteit/admin/") ||
    pathname === "/inschrijven" ||
    pathname.startsWith("/inschrijven/") ||
    pathname === "/registreren" ||
    pathname.startsWith("/registreren/") ||
    pathname === "/welkom" ||
    pathname.startsWith("/welkom/") ||
    pathname === "/adhd-cafe" ||
    pathname.startsWith("/adhd-cafe/") ||
    pathname === "/tiktok" ||
    pathname.startsWith("/tiktok/") ||
    pathname === "/start" ||
    pathname.startsWith("/start/") ||
    pathname === "/en/start" ||
    pathname.startsWith("/en/start/") ||
    pathname === "/en/tiktok" ||
    pathname.startsWith("/en/tiktok/") ||
    pathname === "/jasper" ||
    pathname.startsWith("/jasper/") ||
    pathname === "/onboardingpro" ||
    pathname.startsWith("/onboardingpro/")
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

/** Anonieme/open shell-routes: geen login- of card-trial-gate. */
function isPublicV2Path(pathname: string): boolean {
  if (pathname === "/") return true;
  const prefixes = [
    "/onboarding",
    "/login",
    "/registreren",
    "/abonnement",
    "/stop-abonnement",
    "/privacy",
    "/terms",
    "/dagstart",
    "/dump",
    "/todo",
    "/focus",
    "/shutdown",
    "/settings",
    "/welkom/install",
  ];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function createMiddlewareSupabase(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>;
  supabaseResponse: NextResponse;
} {
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
            request: { headers: request.headers },
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
  return { supabase, supabaseResponse };
}

/**
 * Team/test-only gate voor lab-routes, of voor heel `/v2` tijdens lockdown.
 * Bounce nooit terug naar `/v2/*` als de shell gelockt is.
 */
async function gateV2InternalOnlyRoute(
  request: NextRequest
): Promise<NextResponse> {
  // Lokaal open via isV2PublicEnabled(); lockdown forceert toch team-check
  // alleen wanneer publiek uit staat (production default).
  if (isV2PublicEnabled() && process.env.NODE_ENV === "development") {
    return NextResponse.next({ request });
  }

  if (!isSupabaseConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = resolveV2LockdownBouncePath(request.nextUrl.pathname, false);
    url.search = "";
    return NextResponse.redirect(url, 302);
  }

  const { supabase, supabaseResponse } = createMiddlewareSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  if (isProtectedTestAccount(email) || isInternalTeamAccount(email)) {
    return supabaseResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = resolveV2LockdownBouncePath(
    request.nextUrl.pathname,
    Boolean(user?.id)
  );
  url.search = "";
  return NextResponse.redirect(url, 302);
}

/**
 * Soft dagstart-gate voor publieke v2 shell-routes (`/`, `/todo`, …).
 * Uitgelogd: doorlaten (welkom op `/`). Ingelogd + vandaag geen dagstart: `/dagstart`.
 * Onboarding incompleet: niet stelen naar dagstart.
 */
async function softGateV2AuthenticatedDagstart(
  request: NextRequest,
  event?: NextFetchEvent
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }
  // Geen auth-cookie: skip Supabase-roundtrip (welkom voor uitgelogde `/`).
  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createMiddlewareSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return supabaseResponse;
  }

  const { data: prof, error: profError } = await supabase
    .from("profiles")
    .select(
      "onboarding_completed, onboarding_version, last_dagstart_date, last_seen_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profError || !prof) {
    return supabaseResponse;
  }

  if (
    shouldTouchLastSeen(
      prof.last_seen_at != null ? String(prof.last_seen_at) : null
    )
  ) {
    const touch = touchProfileLastSeenAt(supabase, user.id);
    if (event?.waitUntil) event.waitUntil(touch);
    else void touch;
  }

  const onboardingDone = isProfileOnboardingUpToDate(
    prof.onboarding_completed,
    prof.onboarding_version as number | null | undefined
  );
  // Tijdens onboarding geen harde dagstart-bounce.
  if (!onboardingDone) {
    return supabaseResponse;
  }

  const last =
    prof.last_dagstart_date != null
      ? String(prof.last_dagstart_date).slice(0, 10)
      : null;

  return applyDagstartDbGate(
    request,
    supabaseResponse,
    request.nextUrl.pathname,
    last
  );
}

/**
 * Lichte gate voor beschermde v2-app-routes. Onafhankelijk van
 * STRUCTURO_MIDDLEWARE_PAYWALL: nieuwe card-cohort moet trialing/active hebben.
 */
async function gateProtectedV2Route(
  request: NextRequest,
  event?: NextFetchEvent
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createMiddlewareSupabase(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(url, 302);
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select(
      "onboarding_completed, onboarding_version, subscription_status, subscription_current_period_end, created_at, last_dagstart_date, signup_source, app_trial_override_until, last_seen_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    shouldTouchLastSeen(
      prof?.last_seen_at != null ? String(prof.last_seen_at) : null
    )
  ) {
    const touch = touchProfileLastSeenAt(supabase, user.id);
    if (event?.waitUntil) event.waitUntil(touch);
    else void touch;
  }

  const lastDagstart =
    prof?.last_dagstart_date != null
      ? String(prof.last_dagstart_date).slice(0, 10)
      : null;
  const onboardingDone = isProfileOnboardingUpToDate(
    prof?.onboarding_completed,
    prof?.onboarding_version as number | null | undefined
  );

  const skipPaidGate =
    isProtectedTestAccount(user.email ?? null) ||
    isInternalTeamAccount(user.email ?? null) ||
    process.env.STRUCTURO_DEV_SKIP_SUBSCRIPTION === "1";

  if (!skipPaidGate) {
    const createdAt = prof?.created_at != null ? String(prof.created_at) : null;
    // Alleen hard gate voor nieuwe card-cohort; legacy v2-users houden free-trial.
    if (isV2CardTrialCohort(createdAt)) {
      const ok = profileHasAppAccessOrGrace({
        email: user.email ?? null,
        subscription_status:
          typeof prof?.subscription_status === "string"
            ? prof.subscription_status
            : null,
        subscription_current_period_end:
          typeof prof?.subscription_current_period_end === "string"
            ? prof.subscription_current_period_end
            : prof?.subscription_current_period_end != null
              ? String(prof.subscription_current_period_end)
              : null,
        created_at: createdAt,
        last_dagstart_date: lastDagstart,
        signup_source:
          typeof prof?.signup_source === "string" ? prof.signup_source : null,
        app_trial_override_until:
          prof?.app_trial_override_until != null
            ? String(prof.app_trial_override_until)
            : null,
      });

      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/abonnement";
        url.search = "";
        return NextResponse.redirect(url, 302);
      }
    }
  }

  if (onboardingDone) {
    return applyDagstartDbGate(
      request,
      supabaseResponse,
      request.nextUrl.pathname,
      lastDagstart
    );
  }

  return supabaseResponse;
}

export async function updateSession(
  request: NextRequest,
  event?: NextFetchEvent
) {
  const pathname = request.nextUrl.pathname;

  // /onboardingpro is een zelfstandige testpagina: altijd direct serveren,
  // ongeacht sessie. Zonder deze early return matcht pathname.startsWith("/onboarding")
  // deze route en wordt een ingelogde gebruiker naar de app/dagstart gebounced.
  if (pathname === "/onboardingpro" || pathname.startsWith("/onboardingpro/")) {
    return NextResponse.next({ request });
  }

  // Legacy /v2 app-routes → canonieke URL's. Lab (/v2, /v2/jasper) blijft gated.
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    // Statische assets onder /v2/* (logo) gewoon doorlaten.
    if (
      pathname.startsWith("/v2/logo") ||
      /\.(png|jpe?g|webp|svg|ico|css|js|map)$/i.test(pathname)
    ) {
      return NextResponse.next({ request });
    }

    if (isV2LabPath(pathname)) {
      return gateV2InternalOnlyRoute(request);
    }

    const live = mapLegacyV2PathToLive(pathname);
    if (live !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = live;
      return NextResponse.redirect(url, 308);
    }

    if (isV2LockdownExemptPath(pathname)) {
      return NextResponse.next({ request });
    }
    if (isPublicV2Path(pathname)) {
      if (isV2AppShellDagstartPath(pathname)) {
        return softGateV2AuthenticatedDagstart(request, event);
      }
      return NextResponse.next({ request });
    }
    return gateProtectedV2Route(request, event);
  }

  // Canonieke shell: publieke paden door (met soft dagstart voor app-shell);
  // card-trial gate voor de rest.
  if (isV2LiveShellPath(pathname) && !pathname.startsWith("/v2")) {
    if (isV2LockdownExemptPath(pathname)) {
      return NextResponse.next({ request });
    }
    if (isPublicV2Path(pathname)) {
      if (isV2AppShellDagstartPath(pathname)) {
        return softGateV2AuthenticatedDagstart(request, event);
      }
      return NextResponse.next({ request });
    }
    return gateProtectedV2Route(request, event);
  }

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
    !pathname.startsWith("/auth/callback/") &&
    !isPasswordRecoverySetupPath(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (
      !url.searchParams.has("next") &&
      (isPasswordRecoverySetupPath(pathname) || isPasswordCreatePath(pathname))
    ) {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url, 302);
  }

  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    // Signaleer aan AppLayout dat de DagstartOverlay direct opengeklapt moet worden,
    // zelfs als de cookie zegt "vandaag al klaar". AppLayout maakt de query-param
    // weer schoon na mount.
    url.searchParams.set("dagstart", "open");
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
  let passwordSetupCompleted = true;
  let profileLastDagstartDate: string | null | undefined = undefined;
  let profileRowReadOk = false;
  let subscriptionStatus: string | null | undefined;
  let subscriptionPeriodEnd: string | null | undefined;
  let profileCreatedAt: string | null | undefined;
  let profileSignupSource: string | null | undefined;
  let profileAppTrialOverrideUntil: string | null | undefined;
  let profileLastSeenAt: string | null | undefined;

  if (user) {
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, onboarding_version, password_setup_completed, last_dagstart_date, subscription_status, subscription_current_period_end, created_at, signup_source, app_trial_override_until, last_seen_at"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!profError && prof) {
      profileRowReadOk = true;
      onboardingCompleted = isProfileOnboardingUpToDate(
        prof.onboarding_completed,
        prof.onboarding_version as number | null | undefined
      );
      passwordSetupCompleted = prof.password_setup_completed === true;
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
      profileAppTrialOverrideUntil =
        prof.app_trial_override_until != null
          ? String(prof.app_trial_override_until)
          : null;
      profileLastSeenAt =
        prof.last_seen_at != null ? String(prof.last_seen_at) : null;
    } else {
      onboardingCompleted = false;
    }

    if (
      shouldTouchLastSeen(profileLastSeenAt) &&
      !pathname.startsWith("/activiteit/admin")
    ) {
      const touch = touchProfileLastSeenAt(supabase, user.id);
      if (event?.waitUntil) {
        event.waitUntil(touch);
      } else {
        void touch;
      }
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
    // Anonieme acquisitie-entry: /onboarding zonder sessie start direct de lokale
    // modus. Zonder dit bouncet een CTA-klik vóór React-hydratie (de anchor doet
    // zijn default-navigatie, de client-handler is er nog niet) naar /login en
    // raakt de bezoeker de anonieme funnel kwijt. De cookie is de bron van waarheid
    // voor isLocalMode, dus dit maakt de entry robuust ongeacht hydratie-timing.
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      supabaseResponse.cookies.set("structuro_local_mode", "1", {
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
      });
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
    const privacySetupDone =
      request.cookies.get(PRIVACY_SETUP_DONE_COOKIE)?.value === "1";
    const onboardingReplayBypass = canAccessOnboardingWithoutCheckout({
      replayQuery: request.nextUrl.searchParams.get("replay") === "1",
      privacySetupDone,
      lastDagstartDate: profileLastDagstartDate,
    });
    const payBeforeOnboarding = requiresPaidSubscriptionBeforeOnboarding({
      email: user.email ?? null,
      profileRowReadOk,
      subscription_status: subscriptionStatus,
      subscription_current_period_end: subscriptionPeriodEnd,
      created_at: profileCreatedAt,
      signup_source: profileSignupSource,
    });
    const blockOnboardingForCheckout =
      payBeforeOnboarding && !onboardingReplayBypass;

    if (pathname.startsWith("/onboarding") && blockOnboardingForCheckout) {
      const url = request.nextUrl.clone();
      url.pathname = "/registreren/plan";
      return NextResponse.redirect(url, 302);
    }

    if (
      !pathname.startsWith("/onboarding") &&
      !onPasswordRecovery &&
      !onRegistrationFlow &&
      !pathname.startsWith("/api/")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = blockOnboardingForCheckout
        ? "/registreren/plan"
        : "/onboarding";
      return NextResponse.redirect(url, 302);
    }
    return supabaseResponse;
  }

  const privacySetupDone =
    request.cookies.get(PRIVACY_SETUP_DONE_COOKIE)?.value === "1";

  if (
    onboardingCompleted &&
    profileRowReadOk &&
    !passwordSetupCompleted &&
    !isProtectedTestAccount(user.email ?? null)
  ) {
    if (
      !isPasswordCreatePath(pathname) &&
      !isPasswordRecoverySetupPath(pathname) &&
      !pathname.startsWith("/auth/callback") &&
      !pathname.startsWith("/auth/auth-code-error") &&
      !pathname.startsWith("/api/")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = PASSWORD_CREATE_PATH;
      return NextResponse.redirect(url, 302);
    }
  }

  if (
    onboardingCompleted &&
    profileRowReadOk &&
    passwordSetupCompleted &&
    isPasswordCreatePath(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = privacySetupDone ? resolveLiveHomePath() : "/consent";
    return NextResponse.redirect(url, 302);
  }

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
    url.pathname = privacySetupDone ? resolveLiveHomePath() : "/consent";
    return NextResponse.redirect(url, 302);
  }

  if (user && onboardingCompleted && profileRowReadOk) {
    const skipPaidGate =
      !isMiddlewareSubscriptionPaywallEnabled() ||
      process.env.STRUCTURO_DEV_SKIP_SUBSCRIPTION === "1" ||
      isProtectedTestAccount(user.email ?? null) ||
      isInternalTeamAccount(user.email ?? null) ||
      canAccessWithoutActiveSubscription(pathname);
    if (!skipPaidGate) {
      const ok = profileHasAppAccessOrGrace({
        email: user.email ?? null,
        subscription_status: subscriptionStatus,
        subscription_current_period_end: subscriptionPeriodEnd,
        created_at: profileCreatedAt,
        last_dagstart_date: profileLastDagstartDate,
        signup_source: profileSignupSource,
        app_trial_override_until: profileAppTrialOverrideUntil,
      });
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = resolveLivePaywallPath();
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

/**
 * Bron: profiles.last_dagstart_date (Amsterdam-kalenderdag).
 * Cookie wordt gesynchroniseerd als DB vandaag al klaar is.
 * Ontbreekt vandaag: hard redirect naar `/dagstart` (echte v2-pagina, geen lus).
 */
function applyDagstartDbGate(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  lastDagstartDate: string | null
): NextResponse {
  if (isDagstartGateExemptPath(pathname)) {
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

  if (!shouldRedirectToDagstart(dbYmd)) {
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/dagstart";
  url.search = "";
  const redirect = NextResponse.redirect(url, 302);
  // Auth-cookies van supabaseResponse meenemen zodat sessie niet verloren gaat.
  response.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value);
  });
  const stale = request.cookies.get(STRUCTURO_DAGSTART_COOKIE)?.value;
  if (stale) {
    redirect.cookies.set(STRUCTURO_DAGSTART_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  }
  return redirect;
}

/**
 * Dev-only bypass: laat een lokale tester zonder account de app in zonder de
 * harde /registreren-muur. Wordt in productie genegeerd (zie check op NODE_ENV).
 */
const DEV_LOCAL_BYPASS_COOKIE = "structuro_dev_local_bypass";

/**
 * Lokale test zonder account:
 * - tot de onboarding klaar is (cookie != "2"): verplichte /onboarding.
 * - zodra de onboarding klaar is: harde muur naar /registreren. Een anonieme
 *   gebruiker MOET een account aanmaken en kan dat niet overslaan. De app-shell
 *   is dus niet bereikbaar zonder Supabase-user.
 * - in development kan een dev-bypass-cookie de muur overslaan om lokaal te testen.
 */
function applyLocalAnonymousOnboardingGuard(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): NextResponse {
  const isLoginPath = pathname.startsWith("/login");
  const isAuthPath = pathname.startsWith("/auth");

  // Login, auth en anonieme publieke paginas (incl. /registreren, /privacy,
  // /terms, /welkom en de acquisitie-landings) blijven altijd toegankelijk.
  if (isLoginPath || isAuthPath || isAnonymousPublicPage(pathname)) {
    return response;
  }

  const localObRaw =
    request.cookies.get(LOCAL_ONBOARDING_DONE_COOKIE)?.value;
  const localOnboardingDone = localObRaw === "2";

  if (
    !localOnboardingDone &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url, 302);
  }

  const devLocalBypass =
    process.env.NODE_ENV === "development" &&
    request.cookies.get(DEV_LOCAL_BYPASS_COOKIE)?.value === "1";

  // Harde muur: onboarding klaar maar geen account → altijd naar /registreren.
  // /registreren, /privacy en /terms zijn anonieme publieke paginas en zijn
  // hierboven al teruggegeven, dus hier ontstaat geen redirect-loop. API-routes
  // hebben hun eigen auth en worden niet geredirect.
  if (localOnboardingDone && !devLocalBypass) {
    if (!pathname.startsWith("/api")) {
      const url = request.nextUrl.clone();
      url.pathname = "/registreren";
      return NextResponse.redirect(url, 302);
    }
    return response;
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
    url.searchParams.set("dagstart", "open");
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
    // Zelfde anonieme entry-backstop als het Supabase-pad: /onboarding zonder
    // sessie start direct lokale modus, zodat een CTA-klik vóór hydratie niet
    // naar /login bouncet.
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      const response = NextResponse.next({ request });
      response.cookies.set("structuro_local_mode", "1", {
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
      });
      return applyLocalAnonymousOnboardingGuard(request, response, pathname);
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
