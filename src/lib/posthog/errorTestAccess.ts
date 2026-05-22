/**
 * Toegang tot GET /api/posthog-error-test.
 *
 * - Lokaal (`NODE_ENV=development`): open.
 * - Preview/staging/productie: `POSTHOG_TEST_ENDPOINT=true` én geldig geheim
 *   (`POSTHOG_ERROR_TEST_SECRET` via query `?secret=` of header `x-test-secret`).
 * - Default in productie: 404 (geen publieke smoke-route).
 */
export function isPosthogErrorTestAllowed(request: Request): boolean {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) return true;

  const flagEnabled = process.env.POSTHOG_TEST_ENDPOINT?.trim() === "true";
  if (!flagEnabled) return false;

  const expectedSecret = process.env.POSTHOG_ERROR_TEST_SECRET?.trim();
  if (!expectedSecret) return false;

  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("secret")?.trim() ?? "";
  const fromHeader = request.headers.get("x-test-secret")?.trim() ?? "";
  const provided = fromQuery || fromHeader;

  return provided === expectedSecret;
}
