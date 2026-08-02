import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";
import { requireActivityAdmin } from "@/lib/admin/requireActivityAdmin";
import {
  ensureFreshAccessToken,
  queryCreatorInfo,
} from "@/lib/tiktok/publishClient";
import { isTikTokPublishConfigured } from "@/lib/tiktok/publishConfig";
import {
  openTikTokTokens,
  sealTikTokTokens,
  TIKTOK_TOKEN_COOKIE,
  TIKTOK_TOKEN_COOKIE_MAX_AGE_SEC,
} from "@/lib/tiktok/publishTokens";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireActivityAdmin();
  if (denied) return denied;

  if (!isTikTokPublishConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
    });
  }

  const cookieStore = await cookies();
  const tokens = openTikTokTokens(cookieStore.get(TIKTOK_TOKEN_COOKIE)?.value);
  if (!tokens) {
    return NextResponse.json({
      configured: true,
      connected: false,
    });
  }

  const fresh = await ensureFreshAccessToken(tokens);
  if (!fresh.ok) {
    cookieStore.delete(TIKTOK_TOKEN_COOKIE);
    return NextResponse.json({
      configured: true,
      connected: false,
      error: fresh.error,
    });
  }

  if (fresh.refreshed) {
    const sealed = sealTikTokTokens(fresh.tokens);
    if (sealed) {
      cookieStore.set(TIKTOK_TOKEN_COOKIE, sealed, {
        httpOnly: true,
        secure: getAppOrigin().startsWith("https://"),
        sameSite: "lax",
        path: "/",
        maxAge: TIKTOK_TOKEN_COOKIE_MAX_AGE_SEC,
      });
    }
  }

  const creator = await queryCreatorInfo(fresh.tokens.access_token);
  if (!creator.ok) {
    return NextResponse.json({
      configured: true,
      connected: true,
      open_id: fresh.tokens.open_id,
      scope: fresh.tokens.scope,
      error: creator.error,
      message: creator.message,
    });
  }

  return NextResponse.json({
    configured: true,
    connected: true,
    open_id: fresh.tokens.open_id,
    scope: fresh.tokens.scope,
    creator: creator.creator,
  });
}
