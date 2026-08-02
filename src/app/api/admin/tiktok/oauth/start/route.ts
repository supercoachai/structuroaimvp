import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";
import { requireActivityAdmin } from "@/lib/admin/requireActivityAdmin";
import { buildAuthorizeUrl } from "@/lib/tiktok/publishClient";
import {
  isTikTokPublishConfigured,
  TIKTOK_PUBLISH_PAGE_PATH,
} from "@/lib/tiktok/publishConfig";
import {
  createOAuthState,
  packOAuthStateCookie,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_OAUTH_STATE_MAX_AGE_SEC,
} from "@/lib/tiktok/publishTokens";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireActivityAdmin();
  if (denied) return denied;

  if (!isTikTokPublishConfigured()) {
    const url = new URL(TIKTOK_PUBLISH_PAGE_PATH, getAppOrigin());
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set(TIKTOK_OAUTH_STATE_COOKIE, packOAuthStateCookie(state), {
    httpOnly: true,
    secure: getAppOrigin().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: TIKTOK_OAUTH_STATE_MAX_AGE_SEC,
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
