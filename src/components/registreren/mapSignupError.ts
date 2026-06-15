import { AuthApiError } from "@supabase/supabase-js";

function isInvalidEmailSignupError(err: unknown): boolean {
  if (err instanceof AuthApiError) {
    const code = (err.code ?? "").toLowerCase();
    if (
      code === "email_address_invalid" ||
      code === "invalid_email" ||
      code === "validation_failed"
    ) {
      return true;
    }
  }

  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  return (
    lower.includes("invalid email") ||
    (lower.includes("email") && lower.includes("is invalid"))
  );
}

export function mapSignupError(
  err: unknown,
  t: (key: string) => string
): string {
  if (isInvalidEmailSignupError(err)) {
    return t("registrerenPage.errEmailInvalid");
  }

  const raw = err instanceof Error ? err.message : t("registrerenPage.errGeneric");
  const lower = raw.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return t("registrerenPage.errEmailInUse");
  }
  if (lower.includes("password") && lower.includes("least")) {
    return t("registrerenPage.errPasswordWeak");
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return t("registrerenPage.errNetwork");
  }
  if (lower.includes("email not confirmed")) {
    return t("login.errEmailConfirm");
  }
  if (lower.includes("service_role_unavailable")) {
    return t("registrerenPage.errDevServiceRole");
  }
  if (lower.includes("signup_session_failed")) {
    return t("registrerenPage.errGeneric");
  }
  return raw;
}
