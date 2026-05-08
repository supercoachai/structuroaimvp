import { redirect } from "next/navigation";

type Props = { searchParams?: Promise<{ source?: string }> };

/** Publieke registratie-URL: structuro.eu-CTA's wijzen hierheen. Doorstuur naar login met bron voor analytics. */
export default async function RegistrerenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const raw = typeof sp.source === "string" ? sp.source : "";
  const allowed = ["landing", "direct", "linkedin"];
  const s =
    raw && allowed.includes(raw.toLowerCase()) ? raw.toLowerCase() : "direct";
  redirect(`/login?signup=1&source=${encodeURIComponent(s)}`);
}
