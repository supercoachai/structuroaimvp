import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";
import {
  ADMIN_COOKIE_MAX_AGE_SEC,
  adminCookieName,
  isAdminSecretValid,
  signAdminCookie,
  type AdminScope,
} from "@/lib/admin/adminSession";

export const runtime = "nodejs";

function isScope(v: unknown): v is AdminScope {
  return v === "activity";
}

/** Wisselt het admin-secret in voor een ondertekend httpOnly-cookie. */
export async function POST(request: Request) {
  let body: { scope?: string; secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const scope = body.scope;
  if (!isScope(scope)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }

  if (!isAdminSecretValid(scope, body.secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName(scope), signAdminCookie(scope), {
    httpOnly: true,
    secure: getAppOrigin().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_SEC,
  });

  return NextResponse.json({ ok: true });
}
