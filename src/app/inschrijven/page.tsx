import { redirect } from "next/navigation";

const REGISTREREN = "/registreren";

function legacySourceQuery(source: string | undefined): string {
  if (!source) return "";
  const trimmed = source.trim().slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!trimmed || trimmed === "direct") return "";
  return `?source=${encodeURIComponent(trimmed)}`;
}

type PageProps = {
  searchParams: Promise<{ source?: string }>;
};

/** Legacy URL: doorsturen naar account aanmaken (geen wachtlijst meer). */
export default async function InschrijvenRedirectPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  redirect(`${REGISTREREN}${legacySourceQuery(sp.source)}`);
}
