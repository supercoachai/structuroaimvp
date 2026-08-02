import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminCookie } from "@/lib/admin/adminSession";

/** True als de activity-admin cookie geldig is. */
export async function isActivityAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminCookie(
    "activity",
    cookieStore.get(adminCookieName("activity"))?.value
  );
}

export async function requireActivityAdmin(): Promise<NextResponse | null> {
  if (await isActivityAdminAuthed()) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
