"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type DagstartViewportFitProps = {
  children: ReactNode;
  className?: string;
  remeasureKey?: string | number;
  /** Vul beschikbare hoogte (nodig voor verticale centrering in kind). */
  fillHeight?: boolean;
  /** Waar de inhoud verticaal landt als er ruimte over is (alleen zonder fillHeight). */
  verticalAlign?: "center" | "end";
};

type FitLayout = {
  scale: number;
  fittedHeight: number;
};

/** Schaal dagstart-inhoud (stap 1) zodat alles op 1 scherm past. Geen bredere layout-box (voorkomt clipping). */
export default function DagstartViewportFit({
  children,
  className = "",
  remeasureKey,
  fillHeight = false,
  verticalAlign = "end",
}: DagstartViewportFitProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<FitLayout>({ scale: 1, fittedHeight: 0 });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!shell || !content) return;

    const measure = () => {
      const available = shell.clientHeight;
      const needed = content.scrollHeight;
      if (available < 8 || needed < 8) return;
      const scale = Math.min(1, available / needed);
      const fittedHeight = Math.ceil(needed * scale);
      setLayout((prev) => {
        if (
          Math.abs(prev.scale - scale) < 0.004 &&
          Math.abs(prev.fittedHeight - fittedHeight) < 2
        ) {
          return prev;
        }
        return { scale, fittedHeight };
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(shell);
    ro.observe(content);
    const mo = new MutationObserver(measure);
    mo.observe(content, { childList: true, subtree: true, attributes: true, characterData: true });
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [remeasureKey]);

  const scaled = layout.scale < 0.995;

  return (
    <div
      ref={shellRef}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
    >
      <div
        className={`mx-auto flex w-full max-w-md min-h-0 justify-center ${
          fillHeight && !scaled ? "h-full flex-1 flex-col" : "shrink-0"
        } ${!fillHeight && !scaled ? (verticalAlign === "end" ? "items-end" : "items-center") : ""}`}
        style={
          scaled && layout.fittedHeight > 0
            ? { height: layout.fittedHeight, maxHeight: "100%" }
            : fillHeight
              ? { minHeight: 0, flex: 1 }
              : { minHeight: 0, flex: scaled ? undefined : 1 }
        }
      >
        <div
          ref={contentRef}
          className={`w-full max-w-md ${fillHeight && !scaled ? "flex h-full min-h-0 flex-col" : "shrink-0"}`}
          style={
            scaled
              ? {
                  transform: `scale(${layout.scale})`,
                  transformOrigin: "top center",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
