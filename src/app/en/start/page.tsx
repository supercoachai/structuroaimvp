import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Engelse bio-link: /en/start → /start met lang=en (behoud UTM-params). */
export default async function EnStartRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  query.set("lang", "en");
  const qs = query.toString();
  redirect(qs ? `/start?${qs}` : "/start?lang=en");
}
