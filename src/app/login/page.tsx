import type { Metadata } from "next";

import LoginV2Client from "@/components/v2/LoginV2Client";
import { sanitizeNextPath } from "@/lib/safeRedirect";

export const metadata: Metadata = {
  title: "Inloggen · Structuro",
  description: "Log in op Structuro. Verder waar je gebleven was.",
  alternates: { canonical: "https://www.structuro.ai/login" },
  robots: { index: true, follow: true },
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <LoginV2Client nextPath={sanitizeNextPath(params.next)} />;
}
