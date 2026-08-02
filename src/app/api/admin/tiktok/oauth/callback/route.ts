import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";
import { requireActivityAdmin } from "@/lib/admin/requireActivityAdmin";
import { exchangeAuthorizationCode } from "@/lib/tiktok/publishClient";
import { TIKTOK_PUBLISH_PAGE_PATH } from "@/lib/tiktok/publishConfig";
import {
  sealTikTokTokens,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_TOKEN_COOKIE,
  TIKTOK_TOKEN_COOKIE_MAX_AGE_SEC,
  verifyOAuthStateCookie,
} from "@/lib/tiktok/publishTokens";

export const runtime = "nodejs";

function pageRedirect(query: Record<string, string>): NextResponse {
  const url = new URL(TIKTOK_PUBLISH_PAGE_PATH, getAppOrigin());
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const denied = await requireActivityAdmin();
  if (denied) {
    return pageRedirect({ error: "unauthorized" });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return pageRedirect({
      error: oauthError,
      message: searchParams.get("error_description") ?? "",
    });
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;
  if (!verifyOAuthStateCookie(stateCookie, state)) {
    return pageRedirect({ error: "invalid_state" });
  }

  cookieStore.delete(TIKTOK_OAUTH_STATE_COOKIE);

  if (!code) {
    return pageRedirect({ error: "missing_code" });
  }

  const exchanged = await exchangeAuthorizationCode(code);
  if (!exchanged.ok) {
    return pageRedirect({
      error: exchanged.error,
      message: exchanged.message ?? "",
    });
  }

  const sealed = sealTikTokTokens(exchanged.tokens);
  if (!sealed) {
    return pageRedirect({ error: "token_seal_failed" });
  }

  cookieStore.set(TIKTOK_TOKEN_COOKIE, sealed, {
    httpOnly: true,
    secure: getAppOrigin().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: TIKTOK_TOKEN_COOKIE_MAX_AGE_SEC,
  });

  return pageRedirect({ connected: "1" });
}
