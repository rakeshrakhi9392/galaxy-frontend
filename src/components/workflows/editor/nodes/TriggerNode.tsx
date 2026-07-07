import { Handle, Position, type NodeProps } from "reactflow";
import { Zap } from "lucide-react";
import { NodeStatusBanner, WorkflowNodeShell, type LiveExecutionStatus } from "./NodeStatusBanner";

type TriggerData = {
  label?: string;
  liveExecutionStatus?: LiveExecutionStatus;
};

export function TriggerNode({ data, selected }: NodeProps<TriggerData>) {
  return (
    <WorkflowNodeShell selected={selected} liveStatus={data.liveExecutionStatus}>
      {data.liveExecutionStatus === "FAILED" ? (
        <NodeStatusBanner status={data.liveExecutionStatus} />
      ) : null}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <Zap className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Trigger</div>
          <div className="truncate text-xs text-gray-500">{data.label ?? "Workflow start"}</div>
        </div>
      </div>
      <div className="p-4 text-xs text-gray-500">Starts the workflow when run.</div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!h-3.5 !w-3.5 !border-2 !border-indigo-500/50 !bg-indigo-500"
        style={{ right: -21 }}
      />
    </WorkflowNodeShell>
  );
}
