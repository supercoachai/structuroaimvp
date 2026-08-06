import type { Metadata } from "next";

import LoginV2Client from "@/components/v2/LoginV2Client";
import { sanitizeNextPath } from "@/lib/safeRedirect";

export const metadata: Metadata = {
  title: "Structuro v2 | Inloggen",
  description: "Welkom terug. Inloggen met Google of e-mail.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function V2LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <LoginV2Client nextPath={sanitizeNextPath(params.next)} />;
}
