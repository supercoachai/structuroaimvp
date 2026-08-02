import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";
import { requireActivityAdmin } from "@/lib/admin/requireActivityAdmin";
import {
  ensureFreshAccessToken,
  initPhotoPost,
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

type Body = {
  title?: string;
  description?: string;
  photoImages?: string[];
  photoCoverIndex?: number;
  privacyLevel?: string;
  disableComment?: boolean;
  autoAddMusic?: boolean;
};

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const denied = await requireActivityAdmin();
  if (denied) return denied;

  if (!isTikTokPublishConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const photoImages = Array.isArray(body.photoImages)
    ? body.photoImages.map((u) => String(u).trim()).filter(Boolean)
    : [];

  if (photoImages.length < 1 || photoImages.length > 35) {
    return NextResponse.json(
      { error: "invalid_photo_count", message: "1 tot 35 https image URLs." },
      { status: 400 }
    );
  }

  if (!photoImages.every(isHttpsUrl)) {
    return NextResponse.json(
      { error: "invalid_photo_url", message: "Alleen https URLs toegestaan." },
      { status: 400 }
    );
  }

  const coverIndex =
    typeof body.photoCoverIndex === "number" &&
    Number.isInteger(body.photoCoverIndex)
      ? body.photoCoverIndex
      : 0;

  if (coverIndex < 0 || coverIndex >= photoImages.length) {
    return NextResponse.json({ error: "invalid_cover_index" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim().slice(0, 90);
  const description = String(body.description ?? "").trim().slice(0, 4000);

  const cookieStore = await cookies();
  const tokens = openTikTokTokens(cookieStore.get(TIKTOK_TOKEN_COOKIE)?.value);
  if (!tokens) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const fresh = await ensureFreshAccessToken(tokens);
  if (!fresh.ok) {
    cookieStore.delete(TIKTOK_TOKEN_COOKIE);
    return NextResponse.json({ error: fresh.error }, { status: 401 });
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
    return NextResponse.json(
      { error: creator.error, message: creator.message },
      { status: 400 }
    );
  }

  const options = creator.creator.privacy_level_options;
  let privacyLevel = String(body.privacyLevel ?? "").trim();
  if (!privacyLevel || !options.includes(privacyLevel)) {
    privacyLevel = options.includes("SELF_ONLY")
      ? "SELF_ONLY"
      : (options[0] ?? "SELF_ONLY");
  }

  const result = await initPhotoPost({
    accessToken: fresh.tokens.access_token,
    title,
    description,
    privacyLevel,
    photoImages,
    photoCoverIndex: coverIndex,
    disableComment: Boolean(body.disableComment),
    autoAddMusic: body.autoAddMusic !== false,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: result.message,
      },
      { status: result.status && result.status >= 400 ? result.status : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    publish_id: result.publish_id,
    privacy_level: privacyLevel,
    creator_username: creator.creator.creator_username,
  });
}
