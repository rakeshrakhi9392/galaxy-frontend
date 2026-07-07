"use client";

import { useEffect, useState, type RefObject } from "react";

export type CanvasChromeBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const EMPTY_BOUNDS: CanvasChromeBounds = { top: 0, left: 0, width: 0, height: 0 };

/** Tracks the canvas container's viewport rect for screen-fixed chrome positioning. */
export function useCanvasChromeBounds(
  containerRef: RefObject<HTMLElement | null>,
  layoutKey = 0,
): CanvasChromeBounds {
  const [bounds, setBounds] = useState<CanvasChromeBounds>(EMPTY_BOUNDS);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [containerRef, layoutKey]);

  return bounds;
}
