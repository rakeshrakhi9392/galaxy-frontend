import { Handle, Position, type NodeProps } from "reactflow";
import { FileOutput } from "lucide-react";
import { NodeStatusBanner, WorkflowNodeShell, type LiveExecutionStatus } from "./NodeStatusBanner";

type OutputData = {
  label?: string;
  result?: unknown;
  liveExecutionStatus?: LiveExecutionStatus;
};

function renderResult(result: unknown) {
  if (result == null) return null;
  if (typeof result === "string") {
    return <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-gray-700">{result}</pre>;
  }
  return (
    <pre className="max-h-[200px] overflow-auto font-mono text-[10px] leading-relaxed text-gray-700">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export function OutputNode({ data, selected }: NodeProps<OutputData>) {
  const hasResult = data.result != null;

  return (
    <WorkflowNodeShell selected={selected} liveStatus={data.liveExecutionStatus}>
      {data.liveExecutionStatus === "FAILED" ? (
        <NodeStatusBanner status={data.liveExecutionStatus} />
      ) : null}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
          <FileOutput className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Output</div>
          <div className="truncate text-xs text-gray-500">{data.label ?? "Result"}</div>
        </div>
      </div>
      <div className="relative p-4">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!h-3.5 !w-3.5 !border-2 !border-indigo-500/50 !bg-indigo-500"
          style={{ left: -21, top: 40 }}
        />
        {hasResult ? (
          <div className="rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 dark:border-zinc-700 dark:bg-zinc-800">
            {renderResult(data.result)}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">No output added yet</div>
        )}
      </div>
    </WorkflowNodeShell>
  );
}
