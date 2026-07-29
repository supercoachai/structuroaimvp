"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

/**
 * /registreren is geen stap meer in het kritieke pad.
 * Direct door naar welkom → energy → klaar.
 */
export default function RegisterV2Client() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return <StructuroLogoLoading fullScreen={false} className="v2-fade min-h-[40vh] bg-transparent" />;
}
