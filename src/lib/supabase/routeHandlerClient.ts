import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/authStorage";

type RouteHandlerSupabase = ReturnType<typeof createServerClient>;

/**
 * Route handlers moeten auth-cookies op het redirect-response zetten.
 * Alleen cookieStore.set() is onbetrouwbaar bij NextResponse.redirect().
 */
export async function createRouteHandlerSupabaseClient(
  response: NextResponse
): Promise<RouteHandlerSupabase> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
    auth: {
      storageKey: STRUCTURO_SUPABASE_AUTH_STORAGE_KEY,
    },
  });
}
