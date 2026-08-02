import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireActivityAdmin } from "@/lib/admin/requireActivityAdmin";
import { revokeAccessToken } from "@/lib/tiktok/publishClient";
import {
  openTikTokTokens,
  TIKTOK_TOKEN_COOKIE,
} from "@/lib/tiktok/publishTokens";

export const runtime = "nodejs";

export async function POST() {
  const denied = await requireActivityAdmin();
  if (denied) return denied;

  const cookieStore = await cookies();
  const tokens = openTikTokTokens(cookieStore.get(TIKTOK_TOKEN_COOKIE)?.value);
  if (tokens?.access_token) {
    await revokeAccessToken(tokens.access_token);
  }
  cookieStore.delete(TIKTOK_TOKEN_COOKIE);

  return NextResponse.json({ ok: true });
}
