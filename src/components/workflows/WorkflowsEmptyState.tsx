import { GitBranch, Plus } from "lucide-react";
import type { ReactNode } from "react";

export function WorkflowsEmptyState({ createAction }: { createAction: ReactNode }) {
  return (
    <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 px-6 py-20 text-center dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-950/50">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
        <GitBranch className="h-7 w-7 text-zinc-500 dark:text-zinc-400" />
      </div>

      <h2 className="mt-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No workflows yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Create your first workflow to connect nodes, automate tasks, and track runs in real time.
      </p>

      <div className="mt-8">{createAction}</div>
    </div>
  );
}

export function NewWorkflowButton({ label = "New workflow" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
