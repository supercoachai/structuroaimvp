"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WelkomInstallHint from "@/components/welkom/WelkomInstallHint";
import { useI18n } from "@/lib/i18n";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

function WelkomInstallPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewInstall =
    process.env.NODE_ENV === "development" &&
    searchParams?.get("previewInstall") === "1";
  const [ready, setReady] = useState(previewInstall);

  useEffect(() => {
    if (previewInstall) return;
    if (!shouldShowPwaInstallHint()) {
      router.replace("/onboarding");
      return;
    }
    setReady(true);
  }, [previewInstall, router]);

  const backHref = previewInstall ? "/welkom?previewInstall=1" : "/welkom";

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
        …
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--st-bg)] px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 rounded-lg px-2 py-1 text-lg text-slate-500 transition hover:text-slate-800 sm:left-4"
        aria-label={t("welkomPage.installBack")}
      >
        ←
      </button>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--st-blue)]/10 blur-3xl" />
        <div className="absolute bottom-8 right-[-4rem] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center">
        <WelkomInstallHint
          visible
          onContinue={() => router.push("/onboarding")}
          continueLabel={t("welkomPage.installContinueCta")}
          busyLabel={t("registrerenPage.submitBusy")}
        />
      </div>
    </div>
  );
}

export default function WelkomInstallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
          …
        </div>
      }
    >
      <WelkomInstallPageInner />
    </Suspense>
  );
}
