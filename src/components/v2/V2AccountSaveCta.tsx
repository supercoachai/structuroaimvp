"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import { buildV2RegistrerenHref } from "@/lib/v2/v2RegistrerenHref";

import { v2Styles } from "./theme";

type V2AccountSaveCtaProps = {
  /** utm_content voor attributie */
  content: string;
  /**
   * link = rustige tekst onder primary (done/home).
   * soft = lichte card zonder filled CTA (minder concurrentie met Start focus).
   */
  variant?: "link" | "soft" | "card";
};

/**
 * Soft account-brug na eerste waarde in V2.
 * Google-first: /registreren is al Google-primary; copy stuurt daarheen
 * zonder multi-CTA-muur in v2 zelf.
 */
export default function V2AccountSaveCta({
  content,
  variant = "link",
}: V2AccountSaveCtaProps) {
  const [href, setHref] = useState("/registreren?from=v2");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hasSupabaseAuthHintOnClient()) {
      setHidden(true);
      return;
    }
    setHref(buildV2RegistrerenHref({ content }));
  }, [content]);

  if (hidden) return null;

  if (variant === "soft" || variant === "card") {
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
        <Link
          href={href}
          className="v2-link mt-2 inline-flex w-full items-center justify-center"
          style={{ textAlign: "center" }}
        >
          Bewaar met Google
        </Link>
      </section>
    );
  }

  return (
    <Link href={href} className="v2-link" style={v2Styles.backLink}>
      Bewaar met Google
    </Link>
  );
}
