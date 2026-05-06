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

function isPublicLegalDocsPath(pathname: string): boolean {
  return (
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/")
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

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
    return NextResponse.redirect(url);
  }

  if (pathname === "/dagstart" || pathname.startsWith("/dagstart/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
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
          supabaseResponse = NextResponse.next({ request });
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
    if (isLoginPath || isAuthPath || isPublicLegalDocsPath(pathname)) {
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
  if (user) {
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, onboarding_version, last_dagstart_date"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profileErr && profileRow) {
      onboardingCompleted = isProfileOnboardingUpToDate(
        profileRow.onboarding_completed,
        profileRow.onboarding_version as number | null | undefined
      );
      profileRowReadOk = true;
      profileLastDagstartDate =
        profileRow.last_dagstart_date != null
          ? String(profileRow.last_dagstart_date).slice(0, 10)
          : null;
    } else if (profileErr) {
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
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const hasSession = Boolean(user) || hasSupabaseAuthCookie(request);

  if (!hasSession) {
    if (isLoginPath || isAuthPath || isPublicLegalDocsPath(pathname)) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  /** Sessie-cookie maar user nog niet gehydrateerd: niet blokkeren. */
  if (!user) {
    return applyDagstartCookieGuard(request, supabaseResponse, pathname);
  }

  if (!onboardingCompleted) {
    const onPasswordRecovery =
      pathname === "/auth/wachtwoord-instellen" ||
      pathname.startsWith("/auth/wachtwoord-instellen/");
    if (
      !pathname.startsWith("/onboarding") &&
      !onPasswordRecovery &&
      !isPublicLegalDocsPath(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
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
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/onboarding") &&
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

  if (isLoginPath || isAuthPath || isPublicLegalDocsPath(pathname)) {
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
    return NextResponse.redirect(url);
  }

  if (
    localOnboardingDone &&
    pathname.startsWith("/onboarding")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
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
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next({ request });
  }

  const localModeCookie = request.cookies.get("structuro_local_mode")?.value;
  const hasAuth = hasSupabaseAuthCookie(request);

  if (!hasAuth && !localModeCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
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
