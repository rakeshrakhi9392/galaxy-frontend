import type { RunStatus } from "@/lib/types";

const STATUS_STYLES: Record<RunStatus, { label: string; className: string }> = {
  QUEUED: {
    label: "Queued",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  RUNNING: {
    label: "Running",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  SUCCESS: {
    label: "Success",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  SKIPPED: {
    label: "Skipped",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
