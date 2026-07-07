"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil } from "lucide-react";
import { forkWorkflowAction } from "@/app/workflows/actions";
import type { Workflow } from "@/lib/types";
import { workflowCanvasHref } from "@/lib/workflows/tabs";
import { WorkflowStructurePreview } from "./WorkflowStructurePreview";

export function WorkflowTab({ workflow }: { workflow: Workflow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isSystemWorkflow = workflow.type === "SYSTEM";

  const handlePrimaryAction = () => {
    if (isSystemWorkflow) {
      startTransition(async () => {
        try {
          const clonedId = await forkWorkflowAction(workflow.id);
          router.push(workflowCanvasHref(clonedId));
        } catch {
          window.alert("Failed to clone workflow");
        }
      });
      return;
    }

    router.push(workflowCanvasHref(workflow.id));
  };

  const buttonLabel = isSystemWorkflow
    ? pending
      ? "Cloning..."
      : "Clone workflow"
    : "Edit Workflow";

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[18px] border border-border border-b-0 bg-card text-card-foreground shadow-sm">
        <div className="relative z-10 flex shrink-0 flex-row items-center justify-between space-y-0 px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">Workflow Structure</h3>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-gray-200 bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-neutral-700"
          >
            {!isSystemWorkflow ? (
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
            {buttonLabel}
          </button>
        </div>
        <div className="h-px w-full shrink-0 bg-border" />
        <div className="min-h-0 flex-1">
          <WorkflowStructurePreview graph={workflow} />
        </div>
      </div>
    </div>
  );
}
