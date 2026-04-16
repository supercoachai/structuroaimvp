import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  STRUCTURO_DAGSTART_COOKIE,
  decodeDagstartCookieValue,
  getCalendarDateAmsterdam,
} from "../dagstartCookie";
import { LOCAL_ONBOARDING_DONE_COOKIE } from "../localOnboardingCookie";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.replace(/^https:\/\//, "").split(".")[0];
  if (!projectRef) return false;
  const cookieName = `sb-${projectRef}-auth-token`;
  return Boolean(request.cookies.get(cookieName)?.value);
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

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
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
    if (isLoginPath || isAuthPath) {
      return supabaseResponse;
    }
    return applyLocalAnonymousOnboardingGuard(
      request,
      supabaseResponse,
      pathname
    );
  }

  let onboardingCompleted = true;
  if (user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (!error) {
      onboardingCompleted = data?.onboarding_completed === true;
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
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const hasSession = Boolean(user) || hasSupabaseAuthCookie(request);

  if (!hasSession) {
    if (isLoginPath || isAuthPath) {
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
    if (!pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dagstart";
    return NextResponse.redirect(url);
  }

  return applyDagstartCookieGuard(request, supabaseResponse, pathname);
}

/** Lokale test zonder account: verplichte /onboarding tot cookie gezet is. */
function applyLocalAnonymousOnboardingGuard(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): NextResponse {
  const isLoginPath = pathname.startsWith("/login");
  const isAuthPath = pathname.startsWith("/auth");

  if (isLoginPath || isAuthPath) {
    return response;
  }

  const localOnboardingDone =
    request.cookies.get(LOCAL_ONBOARDING_DONE_COOKIE)?.value === "1";

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
    url.pathname = "/dagstart";
    return NextResponse.redirect(url);
  }

  return applyDagstartCookieGuard(request, response, pathname);
}

function applyDagstartCookieGuard(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): NextResponse {
  const needsDagstart =
    !pathname.startsWith("/dagstart") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api");

  if (needsDagstart) {
    const today = getCalendarDateAmsterdam();
    const raw = request.cookies.get(STRUCTURO_DAGSTART_COOKIE)?.value;
    const cookieVal = decodeDagstartCookieValue(raw);
    if (cookieVal !== today) {
      const url = request.nextUrl.clone();
      url.pathname = "/dagstart";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

function legacyCookieOnlyMiddleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth")
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
