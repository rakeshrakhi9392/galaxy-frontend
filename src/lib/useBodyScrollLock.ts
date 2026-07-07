"use client";

import { useEffect } from "react";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPointerEvents = body.style.pointerEvents;
    const previousPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.setAttribute("data-scroll-locked", "1");
    body.style.overflow = "hidden";
    body.style.pointerEvents = "none";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.removeAttribute("data-scroll-locked");
      body.style.overflow = previousOverflow;
      body.style.pointerEvents = previousPointerEvents;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}
