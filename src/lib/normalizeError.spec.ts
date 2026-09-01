import { describe, expect, it } from "vitest";

import {
  isRecoverableChunkError,
  isSupabaseAuthNetworkError,
} from "./normalizeError";

describe("isSupabaseAuthNetworkError", () => {
  it("herkent een mislukte token-refresh", () => {
    const err = new TypeError("Failed to fetch");
    err.stack = [
      "TypeError: Failed to fetch",
      "    at new Promise (<anonymous>)",
      "    at retryable (node_modules/@supabase/auth-js/dist/module/lib/helpers.js:179:1)",
      "    at SupabaseAuthClient._refreshAccessToken (GoTrueClient.js:3902:35)",
      "    at SupabaseAuthClient._autoRefreshTokenTick (GoTrueClient.js:4539:1)",
    ].join("\n");
    expect(isSupabaseAuthNetworkError(err)).toBe(true);
    expect(isRecoverableChunkError(err)).toBe(false);
  });

  it("laat echte webpack-chunkfouten met Failed to fetch door", () => {
    const err = new TypeError("Failed to fetch");
    err.stack = "TypeError: Failed to fetch\n    at __webpack_require__.f.j";
    expect(isSupabaseAuthNetworkError(err)).toBe(false);
    expect(isRecoverableChunkError(err)).toBe(true);
  });
});
