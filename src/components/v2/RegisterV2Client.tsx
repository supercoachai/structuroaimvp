"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /v2/register is geen stap meer in het kritieke pad.
 * Direct door naar welkom → energy → klaar.
 */
export default function RegisterV2Client() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/v2/onboarding");
  }, [router]);

  return (
    <div
      className="v2-fade"
      style={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: 14,
      }}
      aria-busy="true"
    >
      Even door…
    </div>
  );
}
