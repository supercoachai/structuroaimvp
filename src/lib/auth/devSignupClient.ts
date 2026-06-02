import type { SupabaseClient } from "@supabase/supabase-js";

type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
};

/** Lokaal: admin-createUser + sign-in (Supabase staat publieke signup uit). */
export async function signUpWithLocalDevFallback(
  supabase: SupabaseClient,
  params: SignUpParams
): Promise<{ user: { id: string } }> {
  if (process.env.NODE_ENV !== "development") {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: { full_name: params.fullName },
      },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("signup_failed");

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (signInError) throw signInError;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("signup_session_failed");
    }

    return { user: data.user };
  }

  const res = await fetch("/api/dev/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      full_name: params.fullName,
    }),
  });

  let body: { error?: string } = {};
  try {
    body = (await res.json()) as { error?: string };
  } catch {
    body = {};
  }

  if (!res.ok) {
    throw new Error(body.error ?? "Signup failed");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (signInError) throw signInError;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("signup_failed");
  return { user };
}
