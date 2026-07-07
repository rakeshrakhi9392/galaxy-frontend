"use client";

import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export function WorkflowActionLoader({ message }: { message: string }) {
  useBodyScrollLock(true);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm dark:bg-black/25"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-10 w-10 animate-spin text-[var(--brand-indigo-500)]"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium text-text-primary">{message}</p>
    </div>,
    document.body,
  );
}
