"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "reactflow";
import { FileOutput, Info, Pencil, Trash2 } from "lucide-react";
import {
  resolveResponseFieldBindings,
  toResponseFieldKey,
  type ResponseFieldBinding,
} from "@galaxy/schemas";
import type { NodeUiHandle } from "@/generated/nodeRegistry";
import { stripExecutionOutputsFromNodeData } from "@/lib/editor/graphUtils";
import {
  extractResponseResults,
  resolveResponseFieldValue,
  type ResponseResults,
} from "@/lib/editor/responseResults";
import { useExecutionOutputs } from "../ExecutionOutputsContext";
import { useWorkflowCanvasActions } from "../WorkflowCanvasActions";
import { HANDLE_CLASS_BY_TYPE } from "./SchemaDrivenNodeFields";

export type ResponseBindingsData = {
  label?: string;
  config?: {
    fieldNames?: Record<string, string>;
    [key: string]: unknown;
  };
  inputs?: Record<string, unknown>;
  results?: ResponseResults;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function renderResult(result: unknown) {
  if (result == null) return null;
  if (typeof result === "string") {
    return (
      <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-gray-700 dark:text-zinc-300">
        {result}
      </pre>
    );
  }
  return (
    <pre className="max-h-[200px] overflow-auto font-mono text-[10px] leading-relaxed text-gray-700 dark:text-zinc-300">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function ResponseFieldCard({
  name,
  value,
  onRename,
  onDisconnect,
}: {
  name: string;
  value: unknown;
  onRename: (name: string) => void;
  onDisconnect: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasValue = value !== undefined;

  useEffect(() => {
    if (!editingName) setDraftName(name);
  }, [name, editingName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function commitName() {
    const trimmed = draftName.trim();
    if (trimmed) onRename(trimmed);
    else setDraftName(name);
    setEditingName(false);
  }

  return (
    <div className="space-y-2 rounded-lg bg-[#F5F5F5] p-3 dark:bg-zinc-800">
      <div className="flex items-center gap-1.5">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraftName(name);
                setEditingName(false);
              }
            }}
            className="nodrag min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-sm text-gray-900 outline-none focus:border-[#4f46e6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white" title={name}>
            {name}
          </span>
        )}
        <button
          type="button"
          className="nodrag flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          title="Rename"
          onClick={() => setEditingName(true)}
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nodrag flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
          title="Disconnect"
          onClick={onDisconnect}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-10 items-center justify-center rounded border border-gray-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        {hasValue ? (
          <div className="w-full">{renderResult(value)}</div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-zinc-500">No output yet</span>
        )}
      </div>
    </div>
  );
}

type ResponseBindingsBodyProps = {
  nodeId: string;
  data: ResponseBindingsData;
  title: string;
  description?: string;
  inputHandles: NodeUiHandle[];
};

/** Config-driven body for `ui.body === "response_bindings"`. */
export function ResponseBindingsBody({
  nodeId,
  data,
  title,
  description,
  inputHandles,
}: ResponseBindingsBodyProps) {
  const { setEdges } = useReactFlow();
  const canvasActions = useWorkflowCanvasActions();
  const edges = useStore((state) => state.edges);
  const nodeInternals = useStore((state) => state.nodeInternals);
  const { nodeRuns } = useExecutionOutputs();

  const liveNodeData = useMemo(() => {
    const node = nodeInternals.get(nodeId);
    return asRecord(node?.data) as ResponseBindingsData;
  }, [nodeInternals, nodeId]);

  const results = useMemo(() => {
    const fromNode = liveNodeData.results ?? data.results;
    if (fromNode != null) return fromNode;

    const responseRun = nodeRuns.find(
      (nr) => nr.nodeId === nodeId && nr.status === "SUCCESS",
    );
    return extractResponseResults(responseRun?.output);
  }, [data.results, liveNodeData.results, nodeId, nodeRuns]);

  const bindings = useMemo(() => {
    const nodesById = new Map<string, Node>();
    for (const node of nodeInternals.values()) {
      nodesById.set(node.id, node);
    }
    return resolveResponseFieldBindings(nodeId, data, edges as Edge[], nodesById);
  }, [data, edges, nodeId, nodeInternals]);

  const renameField = useCallback(
    (edgeId: string, name: string) => {
      const fieldKey = toResponseFieldKey(name);
      const nodeData = asRecord(liveNodeData ?? data);
      const config = asRecord(nodeData.config);
      const fieldNames = {
        ...asRecord(config.fieldNames),
        [edgeId]: fieldKey,
      };
      canvasActions?.patchNodeData(nodeId, {
        label: nodeData.label ?? title,
        inputs: nodeData.inputs ?? {},
        config: { ...config, fieldNames },
      });
    },
    [canvasActions, data, liveNodeData, nodeId, title],
  );

  const disconnectField = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      const nodeData = asRecord(liveNodeData ?? data);
      const config = asRecord(nodeData.config);
      const fieldNames = { ...asRecord(config.fieldNames) };
      delete fieldNames[edgeId];
      canvasActions?.patchNodeData(
        nodeId,
        stripExecutionOutputsFromNodeData({
          label: nodeData.label ?? title,
          inputs: nodeData.inputs ?? {},
          config: { ...config, fieldNames },
        }),
      );
    },
    [canvasActions, data, liveNodeData, nodeId, setEdges, title],
  );

  return (
    <>
      <div
        className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-zinc-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-workflow-accent-500/10 text-workflow-accent-500">
          <FileOutput className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        {description ? (
          <div className="group/tip relative" style={{ overflow: "visible" }}>
            <Info
              className="h-3.5 w-3.5 cursor-default text-gray-400 dark:text-zinc-500"
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:bg-zinc-100">
              {description}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4" style={{ overflow: "visible" }}>
        {inputHandles.map((handle) => (
          <div key={handle.id} className="relative" style={{ overflow: "visible" }}>
            <Handle
              type="target"
              position={Position.Left}
              id={handle.id}
              className={HANDLE_CLASS_BY_TYPE[handle.dataType]}
              style={{
                left: -21,
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "crosshair",
              }}
            />
            <span className="text-xs text-gray-500 dark:text-zinc-400">{handle.label}</span>
          </div>
        ))}

        <div className="border-t border-gray-100 dark:border-zinc-800" />

        {bindings.length > 0 ? (
          <div className="space-y-3">
            {bindings.map((binding, index) => (
              <ResponseFieldCard
                key={binding.edgeId}
                name={binding.name}
                value={resolveResponseFieldValue(results, binding, index)}
                onRename={(name) => renameField(binding.edgeId, name)}
                onDisconnect={() => disconnectField(binding.edgeId)}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
            No output added yet
          </div>
        )}
      </div>
    </>
  );
}
