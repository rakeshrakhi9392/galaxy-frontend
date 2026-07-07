"use client";

import { Plus } from "lucide-react";
import { useWorkflowCanvasActions } from "../WorkflowCanvasActions";
import { useWiredField } from "@/lib/editor/useWiredField";

type ConnectorButtonProps = {
  nodeId: string;
  handleId: string;
  fieldLabel?: string;
  className?: string;
};

export function ConnectorButton({
  nodeId,
  handleId,
  fieldLabel,
  className = "",
}: ConnectorButtonProps) {
  const canvasActions = useWorkflowCanvasActions();
  const wired = useWiredField(nodeId, handleId);

  if (wired.connected) return null;

  return (
    <div className="group/tip relative shrink-0">
      <button
        type="button"
        onClick={() => canvasActions?.addToRequest(nodeId, handleId, fieldLabel)}
        disabled={!canvasActions}
        className={[
          "nodrag inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
          className,
        ].join(" ")}
        aria-label="Add to Request"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-1.5 hidden w-max -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover/tip:block"
      >
        Add to Request
      </div>
    </div>
  );
}
