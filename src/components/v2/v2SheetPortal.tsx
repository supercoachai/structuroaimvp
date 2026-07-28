"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Mount bottom-sheets op `.v2-root` zodat `position: fixed` de volle
 * app-viewport dekt (niet de gepaddede page/shell-kolom met beige frames).
 */
export function V2SheetPortal({ children }: { children: ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMount(
      (document.querySelector(".v2-root") as HTMLElement | null) ??
        document.body,
    );
  }, []);

  if (!mount) return null;
  return createPortal(children, mount);
}
