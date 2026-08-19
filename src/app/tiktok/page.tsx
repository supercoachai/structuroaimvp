import { redirect } from "next/navigation";

import { buildSocialVanityRedirectPath } from "@/lib/acquisition/socialVanity";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Fallback als middleware de hop mist. Publieke URL is structuro.eu/tiktok. */
export default async function TikTokVanityRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  redirect(
    buildSocialVanityRedirectPath("/tiktok", query) ??
      "/onboarding?utm_source=tiktok&utm_medium=organic&utm_campaign=tiktok_bio&utm_content=eu_vanity"
  );
}
