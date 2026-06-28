import { NextResponse } from "next/server";
import { captureRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelAnalytics";
import { parseStAttrFromRequest } from "@/lib/posthog/firstTouchAttribution";
import { normalizeSignupSourceKey } from "@/lib/stripe/trialConfig";
import { buildTrustedRedirectUrl, sanitizeNextPath } from "@/lib/safeRedirect";
import { PASSWORD_RECOVERY_PATH } from "@/lib/auth/passwordResetRedirect";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/routeHandlerClient";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { markPasswordSetupCompleted } from "@/lib/auth/passwordSetupProfile";
import {
  LOCAL_ONBOARDING_DONE_COOKIE,
  isLocalOnboardingDoneCookieValue,
} from "@/lib/localOnboardingCookie";
import {
  PREFERRED_NAME_COOKIE,
  sanitizePreferredNameCookieValue,
} from "@/lib/auth/preferredNameCookie";
import {
  ONBOARDING_VERSION_CURRENT,
  isProfileOnboardingUpToDate,
} from "@/lib/onboardingVersion";
import { requiresPaidSubscriptionBeforeOnboarding } from "@/lib/registrationGate";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return undefined;
}

/**
 * Account aangemaakt vanuit de anonieme acquisitie-flow (CTA → onboarding → app):
 * markeer onboarding als afgerond zodat die niet opnieuw start. Lokale taken
 * migreren client-side via TaskContext. Wis de anonieme cookies.
 */
async function claimAnonymousOnboardingOnServer(
  request: Request,
  response: NextResponse,
  userId: string
): Promise<void> {
  const raw = readCookie(request, LOCAL_ONBOARDING_DONE_COOKIE);
  if (!isLocalOnboardingDoneCookieValue(raw)) return;

  // Aanspreeknaam die vóór account-aanmaak op /registreren is opgegeven (ook OAuth).
  const preferredName = sanitizePreferredNameCookieValue(
    readCookie(request, PREFERRED_NAME_COOKIE)
  );

  const admin = createServiceRoleClient();
  if (admin) {
    try {
      await admin.from("profiles").upsert(
        {
          id: userId,
          onboarding_completed: true,
          onboarding_version: ONBOARDING_VERSION_CURRENT,
          last_dagstart_date: getCalendarDateAmsterdam(),
          ...(preferredName.length >= 2
            ? { display_name: preferredName, preferred_name: preferredName }
            : {}),
        },
        { onConflict: "id" }
      );
    } catch {
      /* niet kritiek voor de redirect */
    }
  }

  response.cookies.set(LOCAL_ONBOARDING_DONE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(PREFERRED_NAME_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

function redirectToAuthError(
  origin: string,
  params: Record<string, string>
): NextResponse {
  const q = new URLSearchParams(params);
  return NextResponse.redirect(`${origin}/auth/auth-code-error?${q}`);
}

/**
 * Profiel-routing voor OAuth/magic link (parity met wachtwoord-login).
 * Expliciete bestemming (`next` != "/") wint; anders stuurt onafgemaakte
 * onboarding naar /onboarding of /registreren/plan i.p.v. de app-root.
 */
async function resolveOAuthRedirectPath(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  next: string
): Promise<string> {
  if (next && next !== "/") return next;
  if (isProtectedTestAccount(email)) return "/";

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "onboarding_completed, onboarding_version, subscription_status, subscription_current_period_end, created_at, signup_source"
    )
    .eq("id", userId)
    .maybeSingle();

  const onboardingDone = isProfileOnboardingUpToDate(
    profile?.onboarding_completed,
    profile?.onboarding_version
  );
  if (onboardingDone) return "/";

  const needsPay = requiresPaidSubscriptionBeforeOnboarding({
    email: email ?? null,
    profileRowReadOk: Boolean(profile),
    subscription_status: profile?.subscription_status ?? null,
    subscription_current_period_end:
      profile?.subscription_current_period_end ?? null,
    created_at: profile?.created_at ?? null,
    signup_source: profile?.signup_source ?? null,
  });
  return needsPay ? "/registreren/plan?resume=1" : "/onboarding";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const authErrorDesc = searchParams.get("error_description");

  if (authError || authErrorCode) {
    const p: Record<string, string> = {};
    if (authErrorCode) p.error_code = authErrorCode;
    else if (authError) p.error_code = authError;
    if (authError) p.error = authError;
    if (authErrorDesc) p.error_description = authErrorDesc;
    return redirectToAuthError(origin, p);
  }

  if (code) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const target = buildTrustedRedirectUrl(origin, forwardedHost, next);
    const response = NextResponse.redirect(target);
    const supabase = await createRouteHandlerSupabaseClient(response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user?.id && user.created_at) {
        const createdMs = new Date(user.created_at).getTime();
        const ageMs = Date.now() - createdMs;
        if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 30 * 60 * 1000) {
          const attr = parseStAttrFromRequest(request);
          void captureRegistrationFunnelServer(user.id, "signup_completed", {
            source: attr?.source ?? "direct",
            utm_campaign: attr?.utm_campaign ?? null,
          });
        }
      }

      if (user?.id) {
        await claimAnonymousOnboardingOnServer(request, response, user.id);

        const admin = createServiceRoleClient();
        if (admin) {
          await markPasswordSetupCompleted(admin, user.id);

          // Magic link / OAuth opent vaak een nieuwe tab: sessionStorage is leeg.
          // Schrijf signup_source uit st_attr cookie als het profiel nog geen bron heeft.
          const attr = parseStAttrFromRequest(request);
          const attrSource = normalizeSignupSourceKey(attr?.source);
          if (attrSource && attrSource !== "direct") {
            try {
              await admin
                .from("profiles")
                .update({
                  signup_source: attrSource,
                  ...(attr?.utm_campaign
                    ? { signup_utm_campaign: attr.utm_campaign }
                    : {}),
                })
                .eq("id", user.id)
                .is("signup_source", null);
            } catch {
              /* niet kritiek voor redirect */
            }
          }
        }

        const finalPath = await resolveOAuthRedirectPath(
          supabase,
          user.id,
          user.email,
          next
        );
        if (finalPath !== next) {
          response.headers.set(
            "location",
            buildTrustedRedirectUrl(origin, forwardedHost, finalPath)
          );
        }
      }

      response.cookies.set("structuro_local_mode", "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
      return response;
    }

    return redirectToAuthError(origin, {
      error_code: "exchange_failed",
      error_description: error.message,
    });
  }

  /**
   * Oude reset-mails stuurden naar /auth/callback?next=/auth/wachtwoord-instellen#tokens.
   * De server ziet geen hash; stuur door naar de client-pagina i.p.v. auth-code-error.
   */
  const recoveryNext = sanitizeNextPath(searchParams.get("next"));
  if (
    recoveryNext === PASSWORD_RECOVERY_PATH ||
    recoveryNext.startsWith(`${PASSWORD_RECOVERY_PATH}/`)
  ) {
    return NextResponse.redirect(`${origin}${recoveryNext}`);
  }

  return redirectToAuthError(origin, { error_code: "missing_code" });
}
