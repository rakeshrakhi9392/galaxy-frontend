"use client";

import { useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ChevronDown, Coins, Info, Loader2, Play, RotateCcw } from "lucide-react";
import { formatCreditEstimate, type NodeUiHandle, type NodeUiField } from "@galaxy/schemas";
import { estimateNodeCredits } from "@/lib/editor/estimateNodeCredits";
import { getNodeDefinition } from "@/lib/editor/connectionValidation";
import { useWorkflowCanvasActions } from "../WorkflowCanvasActions";
import { NodeActionsMenu } from "./NodeActionsMenu";
import {
  HANDLE_CLASS_BY_TYPE,
  SchemaDrivenNodeFields,
  SchemaDrivenNodeModeTabs,
  getSchemaFields,
} from "./SchemaDrivenNodeFields";
import {
  RequestDynamicFieldsBody,
  type RequestDynamicFieldsData,
} from "./RequestDynamicFieldsBody";
import {
  ResponseBindingsBody,
  type ResponseBindingsData,
} from "./ResponseBindingsBody";
import { NodeStatusBanner, WorkflowNodeShell, type LiveExecutionStatus } from "./NodeStatusBanner";

type SchemaDrivenNodeData = {
  label?: string;
  config?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  settingsOpen?: boolean;
  lastOutput?: unknown;
  dynamicFields?: unknown[];
  results?: Record<string, unknown> | unknown[];
  liveExecutionStatus?: LiveExecutionStatus;
  locked?: boolean;
  scaffold?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function outputKeyFromHandle(handleId: string): string {
  return handleId.startsWith("out:") ? handleId.slice(4) : handleId;
}

function readOutputValue(lastOutput: unknown, handleId: string): unknown {
  const record = asRecord(lastOutput);
  const key = outputKeyFromHandle(handleId);
  if (key in record) return record[key];
  return lastOutput;
}

function collectMediaUrls(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return item.length > 0 ? [item] : [];
      const record = asRecord(item);
      if (typeof record.url === "string" && record.url.length > 0) return [record.url];
      return [];
    });
  }
  const record = asRecord(value);
  if (typeof record.url === "string" && record.url.length > 0) return [record.url];
  if (typeof record.video_url === "string" && record.video_url.length > 0) {
    return [record.video_url];
  }
  if (typeof record.audio_url === "string" && record.audio_url.length > 0) {
    return [record.audio_url];
  }
  if (typeof record.output === "string" && record.output.length > 0) {
    return [record.output];
  }
  return [];
}

function OutputPreview({
  dataType,
  value,
}: {
  dataType: string;
  value: unknown;
}) {
  const urls = collectMediaUrls(value);

  if (dataType === "text" || dataType === "any") {
    const text =
      typeof value === "string"
        ? value
        : typeof asRecord(value).output === "string"
          ? String(asRecord(value).output)
          : value == null
            ? ""
            : JSON.stringify(value, null, 2);
    if (!text) {
      return (
        <div className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
          No output yet
        </div>
      );
    }
    return (
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-800 dark:text-zinc-200">
        {text}
      </pre>
    );
  }

  if (!urls.length) {
    return (
      <div className="py-10 text-center text-xs text-gray-400 dark:text-zinc-500">
        No output yet
      </div>
    );
  }

  if (dataType === "image" || dataType === "image_list") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url.split("#")[0]}
            alt=""
            className="h-24 w-full rounded-md object-cover"
          />
        ))}
      </div>
    );
  }

  if (dataType === "video" || dataType === "video_list") {
    return (
      <div className="space-y-2">
        {urls.map((url) => (
          <video
            key={url}
            src={url.split("#")[0]}
            controls
            className="h-32 w-full rounded-md bg-black object-contain"
          />
        ))}
      </div>
    );
  }

  if (dataType === "audio" || dataType === "audio_list") {
    return (
      <div className="space-y-2">
        {urls.map((url) => (
          <audio key={url} src={url.split("#")[0]} controls className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-800 dark:text-zinc-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function SchemaDrivenNode({
  id,
  type,
  data,
  selected,
}: NodeProps<SchemaDrivenNodeData>) {
  const nodeType = type ?? "";
  const definition = getNodeDefinition(nodeType);
  const canvasActions = useWorkflowCanvasActions();

  const inputs = useMemo(
    () => ({
      ...asRecord(asRecord(definition?.ui.defaults).inputs),
      ...asRecord(data.inputs),
    }),
    [data.inputs, definition?.ui.defaults],
  );

  const settingsOpen = data.settingsOpen ?? false;
  const settingsLabel = definition?.ui.settingsLabel ?? "Advanced";
  const advancedFields = useMemo(
    () => getSchemaFields(nodeType, "advanced", inputs),
    [inputs, nodeType],
  );
  const hasAdvanced = advancedFields.length > 0;
  const hasModeTabs = Boolean(
    definition?.ui.fields.some(
      (field: NodeUiField) => field.control === "mode_tabs" && field.group === "primary",
    ),
  );
  const outputHandles =
    definition?.ui.handles.filter((handle: NodeUiHandle) => handle.kind === "output") ?? [];

  const creditLabel = useMemo(() => {
    const credits = estimateNodeCredits(nodeType, inputs);
    return credits > 0 ? formatCreditEstimate(credits) : null;
  }, [inputs, nodeType]);

  if (!definition) {
    return (
      <WorkflowNodeShell selected={selected}>
        <div className="px-4 py-3 text-sm text-red-500">Unknown node type: {nodeType}</div>
      </WorkflowNodeShell>
    );
  }

  const def = definition;
  const title = data.label ?? def.ui.title;
  const description = def.ui.description;
  const defaultInputs = asRecord(asRecord(def.ui.defaults).inputs);
  const defaultConfig = asRecord(asRecord(def.ui.defaults).config);

  function patchData(patch: Partial<SchemaDrivenNodeData>) {
    canvasActions?.patchNodeData(id, patch as Record<string, unknown>);
  }

  function updateInputs(patch: Record<string, unknown>) {
    canvasActions?.patchNodeInputs(id, patch);
  }

  function resetInputs() {
    patchData({
      inputs: { ...defaultInputs },
      settingsOpen: false,
      lastOutput: undefined,
    });
  }

  const body = def.ui.body ?? "fields";
  const inputHandles = def.ui.handles.filter((handle: NodeUiHandle) => handle.kind === "input");
  const isExecuting = data.liveExecutionStatus === "RUNNING";

  return (
    <WorkflowNodeShell selected={selected} liveStatus={data.liveExecutionStatus}>
      {data.liveExecutionStatus === "FAILED" ? (
        <NodeStatusBanner status={data.liveExecutionStatus} />
      ) : null}

      {body === "dynamic_fields" ? (
        <RequestDynamicFieldsBody
          nodeId={id}
          data={data as RequestDynamicFieldsData}
          title={title}
          description={description}
        />
      ) : body === "response_bindings" ? (
        <ResponseBindingsBody
          nodeId={id}
          data={data as ResponseBindingsData}
          title={title}
          description={description}
          inputHandles={inputHandles}
        />
      ) : (
        <>
          <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <div className="w-full min-w-0 select-none truncate text-sm font-medium text-gray-900 dark:text-white">
                {title}
              </div>
            </div>
            <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
              {description ? (
                <div className="group/tip relative" style={{ overflow: "visible" }}>
                  <Info
                    className="h-3.5 w-3.5 cursor-default text-gray-400 dark:text-zinc-500"
                    aria-hidden="true"
                  />
                  <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
                    {description}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={resetInputs}
                className="nodrag rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-white"
                aria-label="Reset node"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => canvasActions?.runNode(id)}
                disabled={isExecuting}
                className={[
                  "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  isExecuting
                    ? "animate-run-button-executing cursor-not-allowed border border-workflow-accent-500/30 bg-workflow-accent-500/30 text-workflow-accent-500 disabled:cursor-not-allowed disabled:bg-workflow-accent-500/30 disabled:text-workflow-accent-500 disabled:opacity-100"
                    : "border border-green-500/30 bg-green-500/20 text-green-500 hover:bg-green-500/30 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {isExecuting ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                )}
                <span>{isExecuting ? "Executing" : "Run"}</span>
              </button>
              <NodeActionsMenu
                nodeId={id}
                locked={data.locked === true}
                deletable={data.scaffold !== true}
              />
            </div>
          </div>

          {hasModeTabs ? (
            <div className="px-4 pt-3">
              <SchemaDrivenNodeModeTabs
                nodeId={id}
                nodeType={nodeType}
                inputs={inputs}
                onPatch={updateInputs}
              />
            </div>
          ) : null}

          <div className="px-4 py-4" style={{ overflow: "visible" }}>
            <SchemaDrivenNodeFields
              nodeId={id}
              nodeType={nodeType}
              inputs={inputs}
              onPatch={updateInputs}
              group="primary"
            />

            {hasAdvanced ? (
              <div className="relative" style={{ overflow: "visible" }}>
                <button
                  type="button"
                  onClick={() => patchData({ settingsOpen: !settingsOpen })}
                  className="nodrag group mt-5 flex cursor-pointer items-center gap-2"
                >
                  <ChevronDown
                    className={[
                      "h-4 w-4 text-gray-400 transition-transform",
                      settingsOpen ? "rotate-0" : "-rotate-90",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span
                    data-handle-anchor="label"
                    className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                  >
                    {settingsLabel}
                  </span>
                </button>
                {settingsOpen ? (
                  <div className="mt-4 space-y-4">
                    <SchemaDrivenNodeFields
                      nodeId={id}
                      nodeType={nodeType}
                      inputs={inputs}
                      onPatch={updateInputs}
                      group="advanced"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {outputHandles.map((handle: NodeUiHandle) => (
              <div
                key={handle.id}
                className="relative mt-4 border-t border-gray-100 pt-4 dark:border-zinc-800"
                style={{ overflow: "visible" }}
              >
                <div
                  className="absolute flex items-center"
                  style={{ right: -22, top: 8, transform: "translateY(-50%)", zIndex: 50 }}
                >
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={handle.id}
                    className={[
                      HANDLE_CLASS_BY_TYPE[handle.dataType],
                      "!relative !transform-none",
                    ].join(" ")}
                  />
                </div>
                <div>
                  <div
                    data-handle-anchor="label"
                    className="mb-1.5 text-xs text-gray-500 dark:text-zinc-400"
                  >
                    {handle.label}
                  </div>
                  <div
                    className={[
                      "rounded-lg border border-gray-200 bg-surface-main-background-3 dark:border-zinc-700 dark:bg-zinc-800",
                      handle.dataType === "image_list" ||
                      handle.dataType === "video" ||
                      handle.dataType === "audio"
                        ? "min-h-[120px] p-2"
                        : "min-h-[84px] p-3",
                    ].join(" ")}
                  >
                    <OutputPreview
                      dataType={handle.dataType}
                      value={
                        data.lastOutput != null
                          ? readOutputValue(data.lastOutput, handle.id)
                          : null
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            {creditLabel ? (
              <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
                <Coins className="h-3 w-3" aria-hidden="true" />
                <span>{creditLabel}</span>
                {def.ui.pricing?.description ? (
                  <div className="group/tip relative" style={{ overflow: "visible" }}>
                    <Info className="h-3 w-3 cursor-help" aria-hidden="true" />
                    <div className="pointer-events-none absolute bottom-full right-0 z-[9999] mb-1.5 hidden w-max max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
                      {def.ui.pricing.description}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </WorkflowNodeShell>
  );
}
