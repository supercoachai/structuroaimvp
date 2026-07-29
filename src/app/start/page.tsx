import { redirect } from "next/navigation";

type StartSearchParams = Record<string, string | string[] | undefined>;

/**
 * Legacy acquisitie-bridge. Leesbare UI is uitgefaseerd: altijd door naar
 * /onboarding met behoud van query (utm_*, lang, _ph_did, …).
 * next.config.ts doet hetzelfde als HTTP-redirect; deze page is backstop.
 */
export default async function OrganicStartPage({
  searchParams,
}: {
  searchParams: Promise<StartSearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/onboarding?${qs}` : "/onboarding");
}
