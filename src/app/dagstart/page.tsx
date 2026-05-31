"use client";

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import DagstartFlow from "@/components/dagstart/design/DagstartFlow";

function DagstartBody() {
  const router = useRouter();

  const onComplete = useCallback(() => {
    requestAnimationFrame(() => {
      router.replace("/");
      router.refresh();
    });
  }, [router]);

  return <DagstartFlow onComplete={onComplete} />;
}

export default function DagstartPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--structuro-sub)]">
            …
          </div>
        }
      >
        <DagstartBody />
      </Suspense>
    </div>
  );
}
