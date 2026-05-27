import { useLayoutEffect, useState, type RefObject } from 'react';

const DEFAULT_MIN_SCALE = 0.62;

export type ViewportFitLayout = {
  scale: number;
  fittedHeight: number;
};

export function useViewportContentFit(
  viewportRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  deps: unknown[],
  minScale = DEFAULT_MIN_SCALE
): ViewportFitLayout {
  const [layout, setLayout] = useState<ViewportFitLayout>({ scale: 1, fittedHeight: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const update = () => {
      const available = viewport.clientHeight;
      const needed = content.scrollHeight;
      if (available <= 0 || needed <= 0) return;

      if (needed <= available) {
        setLayout((prev) =>
          prev.scale === 1 && prev.fittedHeight === 0 ? prev : { scale: 1, fittedHeight: 0 }
        );
        return;
      }

      const scale = Math.max(minScale, available / needed);
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

    update();
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    ro.observe(content);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return layout;
}
