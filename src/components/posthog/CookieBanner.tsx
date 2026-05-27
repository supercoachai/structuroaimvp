"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConsent } from "@/lib/posthog/ConsentContext";
import { useI18n } from "@/lib/i18n";
import { isWaitlistMarketingPath } from "@/lib/marketingPaths";

export function CookieBanner() {
  const pathname = usePathname();
  const { consent, consentReady, grant, deny } = useConsent();
  const { t } = useI18n();

  if (isWaitlistMarketingPath(pathname)) return null;
  if (!consentReady || consent !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-label={t("cookie.aria")}
      className="fixed inset-x-0 bottom-0 z-[10050] bg-slate-900 p-4 text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 text-sm sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1">
          {t("cookie.message")}{" "}
          <Link href="/privacy" className="underline">
            {t("cookie.moreInfo")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={deny}
            className="rounded border border-white/30 px-3 py-1.5 hover:bg-white/10"
          >
            {t("cookie.necessaryOnly")}
          </button>
          <button
            type="button"
            onClick={grant}
            className="rounded bg-cyan-400 px-3 py-1.5 font-medium text-slate-900 hover:bg-cyan-300"
          >
            {t("cookie.acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
