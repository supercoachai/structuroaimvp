import type { Metadata } from "next";
import { sanitizeWaitlistSourceParam } from "@/lib/wachtlijst/source";
import WaitlistClient from "./WaitlistClient";

export const metadata: Metadata = {
  title: "Wachtlijst | Structuro",
  description:
    "Meld je aan voor Structuro voor de launch. Één gerichte mail, geen spam.",
};

export default async function WachtlijstPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const sp = await searchParams;
  const initialSource = sanitizeWaitlistSourceParam(sp.source);
  return <WaitlistClient initialSource={initialSource} />;
}
