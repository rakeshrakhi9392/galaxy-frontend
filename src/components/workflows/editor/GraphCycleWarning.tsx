"use client";

import { AlertTriangle } from "lucide-react";

/** Persistent banner when the stored graph contains a directed cycle. */
export function GraphCycleWarning() {
  return (
    <div
      role="alert"
      className="pointer-events-none absolute left-1/2 top-3 z-40 flex w-full max-w-[min(92vw,520px)] -translate-x-1/2 items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/95 px-3.5 py-2.5 text-amber-950 shadow-md backdrop-blur-sm dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-100"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 text-left text-xs font-medium leading-relaxed">
        <p>Connections form a cycle.</p>
        <p className="mt-0.5 font-normal text-amber-800 dark:text-amber-200/90">
          Remove a connection to run or save this workflow.
        </p>
      </div>
    </div>
  );
}
