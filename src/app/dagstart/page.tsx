"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import DayStartCheckIn from "@/components/DayStartCheckIn";

function DagstartBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLunch = searchParams?.get("source") === "lunch";

  const onComplete = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#F4F6FB] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+5.25rem))]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4">
        <DayStartCheckIn
          onComplete={onComplete}
          firstTimeOnboarding={false}
          ignoreStoredSessionEnergy={fromLunch}
        />
      </div>
    </div>
  );
}

export default function DagstartPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--structuro-sub)]">
            …
          </div>
        }
      >
        <DagstartBody />
      </Suspense>
    </AppLayout>
  );
}
