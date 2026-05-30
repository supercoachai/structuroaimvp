export function mapSignupError(
  err: unknown,
  t: (key: string) => string
): string {
  const raw = err instanceof Error ? err.message : t("registrerenPage.errGeneric");
  const lower = raw.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return t("registrerenPage.errEmailInUse");
  }
  if (lower.includes("password") && lower.includes("least")) {
    return t("registrerenPage.errPasswordWeak");
  }
  if (lower.includes("invalid email")) {
    return t("registrerenPage.errEmailInvalid");
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
  return raw;
}
