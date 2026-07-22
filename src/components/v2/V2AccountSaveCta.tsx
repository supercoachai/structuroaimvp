"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buildV2RegistrerenHref } from "@/lib/v2/v2RegistrerenHref";

import {
  dismissAccountSavePrompt,
  shouldShowAccountSavePrompt,
} from "./v2AccountSavePrompt";
import {
  trackV2AccountSaveClicked,
  trackV2AccountSaveShown,
} from "./v2OnboardingFunnel";

type V2AccountSaveCtaProps = {
  /** utm_content voor attributie */
  content: string;
  /** Analytics-surface. */
  surface?: "home";
};

/**
 * Soft account-brug op Home, alleen na eerste focus- of shutdown-win
 * (`firstValueAt` via shouldShowAccountSavePrompt).
 */
export default function V2AccountSaveCta({
  content,
  surface = "home",
}: V2AccountSaveCtaProps) {
  const [href, setHref] = useState("/registreren?from=v2");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowAccountSavePrompt()) {
      setVisible(false);
      return;
    }
    setHref(buildV2RegistrerenHref({ content }));
    setVisible(true);
    trackV2AccountSaveShown(surface);
  }, [content, surface]);

  if (!visible) return null;

  return (
    <section
      className="v2-fade rounded-[16px] px-4 py-3"
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
      }}
      aria-label="Account bewaren"
    >
      <p className="text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
        Wil je dit bewaren? Google is genoeg. Geen druk.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href={href}
          className="v2-link inline-flex items-center justify-center"
          onClick={() => trackV2AccountSaveClicked(surface)}
        >
          Bewaar met Google
        </Link>
        <button
          type="button"
          className="v2-link text-[13px]"
          onClick={() => {
            dismissAccountSavePrompt();
            setVisible(false);
          }}
        >
          Niet nu
        </button>
      </div>
    </section>
  );
}
