import type { ReactNode } from "react";

/** Ephemeral client-only status — never persisted with the workflow graph. */
export type LiveExecutionStatus = "RUNNING" | "FAILED";

export function NodeStatusBanner({ status }: { status: LiveExecutionStatus }) {
  if (status !== "FAILED") return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Failed
    </div>
  );
}

export function WorkflowNodeShell({
  selected,
  liveStatus,
  accentBorder,
  children,
}: {
  selected?: boolean;
  liveStatus?: LiveExecutionStatus;
  accentBorder?: boolean;
  children: ReactNode;
}) {
  // Priority: RUNNING > FAILED > selected > default. Glow is ephemeral live UI only.
  const executing = liveStatus === "RUNNING";
  const failed = !executing && liveStatus === "FAILED";
  const pulsing = executing || failed;

  return (
    <div
      className={[
        "w-[380px] max-w-[380px] cursor-grab overflow-visible rounded-xl border bg-white active:cursor-grabbing dark:bg-zinc-900 [&_.nodrag]:cursor-auto",
        pulsing ? "shadow-none transition-none" : "shadow-2xl transition-all duration-300",
        executing
          ? "border-workflow-accent-500 ring-2 ring-workflow-accent-500/30 animate-node-executing"
          : "",
        failed ? "border-red-500 ring-2 ring-red-500/30 animate-node-failed" : "",
        !pulsing && selected
          ? accentBorder
            ? "border-workflow-accent-500"
            : "border-gray-200 ring-2 ring-workflow-accent-500 dark:border-zinc-700"
          : !pulsing
            ? "border-gray-200 dark:border-zinc-700"
            : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
