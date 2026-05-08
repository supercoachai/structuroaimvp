import type { Metadata } from "next";
import { sanitizeWaitlistSourceParam } from "@/lib/wachtlijst/source";
import WaitlistClient from "../wachtlijst/WaitlistClient";

/**
 * Canonieke marketing-URL voor de wachtlijst (los van de app-shell met taken).
 * Alias: /wachtlijst
 */
export const metadata: Metadata = {
  title: "Inschrijven wachtlijst | Structuro",
  description:
    "Meld je aan voor Structuro voor de launch. Één gerichte mail, geen spam.",
};

export default async function InschrijvenWachtlijstPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const sp = await searchParams;
  const initialSource = sanitizeWaitlistSourceParam(sp.source);
  return <WaitlistClient initialSource={initialSource} />;
}
