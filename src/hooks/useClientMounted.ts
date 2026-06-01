"use client";

import { useEffect, useState } from "react";

/**
 * True na de eerste client mount. Server en eerste hydration-render blijven false,
 * zodat auth-/storage-afhankelijke UI niet hydrateert met andere markup.
 */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
