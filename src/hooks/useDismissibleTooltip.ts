"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Tooltip die op mobiel via tik op (i) opent en alleen sluit door opnieuw op (i) te tikken of buiten te tikken. */
export function useDismissibleTooltip() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const root = wrapperRef.current;
      if (!root) return;
      const node = e.target;
      if (node instanceof Node && !root.contains(node)) {
        setOpen(false);
      }
    };
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return { open, setOpen, toggle, wrapperRef };
}
