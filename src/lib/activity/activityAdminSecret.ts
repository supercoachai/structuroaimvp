/** Geheim voor privé activiteit-dashboard (/activiteit/admin?k=...). */
export function isActivityAdminSecretValid(
  provided: string | null | undefined
): boolean {
  const expected = process.env.STRUCTURO_ACTIVITY_ADMIN_SECRET?.trim() ?? "";
  const k = (provided ?? "").trim();
  if (!expected || !k) return false;
  return k === expected;
}
