import { redirect } from "next/navigation";

const ORGANIC_START = "/start";
const ORGANIC_SOURCE = "structuro_eu";
const LEGACY_CONTENT = "waitlist_legacy";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.trim().slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "");
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Legacy URL. Doorsturen naar de acquisitie-bridge /start met
 * structuro_eu-attributie. Zie ook /wachtlijst voor de gedeelde doctrine.
 */
export default async function InschrijvenRedirectPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(sp)) {
    if (typeof value !== "string") continue;
    const clean = sanitize(value);
    if (!clean) continue;
    if (key === "utm_source" || key === "utm_medium" || key === "utm_campaign") continue;
    if (key === "source" || key === "utm_content") continue;
    params.set(key, clean);
  }

  params.set("utm_source", ORGANIC_SOURCE);
  params.set("utm_medium", "organic");
  params.set("utm_campaign", "waitlist_legacy");
  const legacyContent = sanitize(typeof sp.source === "string" ? sp.source : undefined);
  params.set("utm_content", legacyContent || LEGACY_CONTENT);

  redirect(`${ORGANIC_START}?${params.toString()}`);
}
