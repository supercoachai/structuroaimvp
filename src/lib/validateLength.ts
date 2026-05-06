/**
 * Server-side (en gedeelde) lengte-limieten voor user content.
 * Zie ook supabase-migraties voor CHECK constraints waar van toepassing.
 */
export const LENGTH_LIMITS = {
  TASK_TITLE: 280,
  TASK_NOTES: 2000,
  SHUTDOWN_REFLECTION: 5000,
  SHUTDOWN_NOTES: 5000,
  PARKED_CONTENT: 2000,
} as const;

/**
 * @returns `null` als OK of veld geen string (dan geen lengte-check op dit veld),
 *          anders een Nederlandse fouttekst voor 400-responses.
 */
export function validateLength(
  field: string,
  value: unknown,
  max: number
): string | null {
  if (typeof value !== "string") return null;
  if (value.length > max) {
    return `${field} mag maximaal ${max} tekens zijn`;
  }
  return null;
}

/** Eerste niet-null fout uit een lijst validaties */
export function firstLengthError(errors: Array<string | null>): string | null {
  for (const e of errors) {
    if (e) return e;
  }
  return null;
}
