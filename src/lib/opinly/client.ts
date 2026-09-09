import { createOpinlyClient, type OpinlyClient } from "@opinly/backend";

let cached: OpinlyClient | null | undefined;

/** Server-only. `null` als `OPINLY_API_KEY` ontbreekt, zodat build/verify niet crashen. */
export function getOpinlyClient(): OpinlyClient | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.OPINLY_API_KEY?.trim();
  if (!apiKey) {
    cached = null;
    return null;
  }
  cached = createOpinlyClient({
    apiKey,
    fetch: (url, init) =>
      fetch(url, { ...init, cache: "force-cache", next: { tags: ["opinly"] } }),
  });
  return cached;
}
