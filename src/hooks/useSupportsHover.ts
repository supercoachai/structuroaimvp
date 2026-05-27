import { useEffect, useState } from "react";

const HOVER_POINTER_MQ = "(hover: hover) and (pointer: fine)";

function readSupportsHover(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(HOVER_POINTER_MQ).matches;
}

/** True op desktop met muis; false op touch-first apparaten zonder betrouwbare hover. */
export function useSupportsHover(): boolean {
  const [supportsHover, setSupportsHover] = useState(readSupportsHover);

  useEffect(() => {
    const mq = window.matchMedia(HOVER_POINTER_MQ);
    const update = () => setSupportsHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return supportsHover;
}
