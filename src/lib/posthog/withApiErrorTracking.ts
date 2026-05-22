import { NextResponse } from "next/server";

import { captureServerException } from "./server";
import { extractPostHogSessionIdFromCookieHeader } from "./postHogCookie";

type NextRouteContext = { params: Promise<Record<string, string>> };

type ApiHandlerWithoutContext = (request: Request) => Promise<Response> | Response;

/**
 * Vangt onverwachte throws in API routes af, stuurt naar PostHog, retourneert 500 JSON.
 * Export-signature compatibel met Next.js App Router (inclusief tweede context-arg).
 */
export function withApiErrorTracking(
  routeLabel: string,
  handler: ApiHandlerWithoutContext
): (request: Request, context: NextRouteContext) => Promise<Response> {
  return async (request, _context) => {
    try {
      return await handler(request);
    } catch (error) {
      const sessionId = extractPostHogSessionIdFromCookieHeader(
        request.headers.get("cookie")
      );
      await captureServerException(error, {
        route: routeLabel,
        method: request.method,
        sessionId,
      });
      console.error(`[api] ${routeLabel}`, error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
