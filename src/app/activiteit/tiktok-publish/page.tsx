import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { TikTokPublishClient } from "@/components/admin/TikTokPublishClient";
import { adminCookieName, verifyAdminCookie } from "@/lib/admin/adminSession";

export const metadata: Metadata = {
  title: "TikTok publish (intern)",
  robots: { index: false, follow: false },
};

export default async function TikTokPublishAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    connected?: string;
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const authed = verifyAdminCookie(
    "activity",
    cookieStore.get(adminCookieName("activity"))?.value
  );

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-[var(--st-bg)] px-4">
        <p className="text-sm text-slate-500">Privé-dashboard</p>
        <AdminLoginForm scope="activity" />
      </div>
    );
  }

  const initialError = [params.error, params.message]
    .filter(Boolean)
    .join(": ");

  return (
    <div className="min-h-[100dvh] bg-[var(--st-bg)] px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">
              Intern. Alleen met activity-admin code. Niet voor eindgebruikers.
            </p>
            <h1 className="text-lg font-semibold text-slate-800">
              TikTok Connect & Publish
            </h1>
          </div>
          <Link
            href="/activiteit/admin"
            className="text-sm text-slate-600 underline"
          >
            Activiteit
          </Link>
        </div>

        <TikTokPublishClient
          initialError={initialError || null}
          justConnected={params.connected === "1"}
        />
      </main>
    </div>
  );
}
