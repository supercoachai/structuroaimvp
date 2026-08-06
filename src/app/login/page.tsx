import LoginV2Client from "@/components/v2/LoginV2Client";
import { sanitizeNextPath } from "@/lib/safeRedirect";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <LoginV2Client nextPath={sanitizeNextPath(params.next)} />;
}
