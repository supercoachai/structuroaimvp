/**
 * Next.js throws this when a POST carries a `Next-Action` header whose action id
 * is not in the current build: a stale browser tab after a deploy, or probe
 * traffic. The user cannot act on it, and this app defines no client-invoked
 * server actions, so the request can never resolve. Treat it as expected noise,
 * not an app defect.
 */
export function isExpectedServerActionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to find Server Action/i.test(message);
}
