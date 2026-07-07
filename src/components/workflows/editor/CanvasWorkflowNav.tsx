import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { workflowHubHref } from "@/lib/workflows/tabs";
import type { Workflow } from "@/lib/types";

export function CanvasWorkflowNav({ workflow, name }: { workflow: Workflow; name: string }) {
  return (
    <div className="inline-flex max-w-[min(calc(100vw-180px),480px)] items-center gap-2 rounded-2xl border border-gray-200 bg-white/85 px-2 py-1.5 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/85">
      <Link
        href={workflowHubHref(workflow, "workflow")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        title="Back to Workflow"
        aria-label="Back to Workflow"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <input
        readOnly
        value={name}
        maxLength={120}
        placeholder="Untitled"
        title={name}
        className="h-8 w-[120px] truncate border-none bg-transparent text-[14px] font-normal text-gray-900 outline-none placeholder:text-gray-400 sm:w-[160px] dark:text-white dark:placeholder:text-zinc-500"
        aria-label="Workflow name"
      />
    </div>
  );
}
