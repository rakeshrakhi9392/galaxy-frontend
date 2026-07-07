"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import type { Node } from "reactflow";
import type { NodeRun, RunStatus, RunWithNodes, WorkflowRun } from "@/lib/types";
import { useClientApi } from "@/lib/useClientApi";
import { useWorkflowRunRealtime } from "@/lib/useWorkflowRunRealtime";
import { formatNodeRunInputForDisplay } from "@/lib/runHistory/formatNodeRunInputForDisplay";
import { buildRequestFieldLabelMaps } from "@/lib/runHistory/requestFieldLabels";
import type { ExecutionAction, ExecutionState } from "@/lib/runHistory/executionState";
import {
  isLiveOnlyPayload,
  mergeDbNodeRunsIntoLive,
  nodeRunsEqual,
  upsertLiveNodeRuns,
} from "@/lib/runHistory/mergeDbNodeRunsIntoLive";
import {
  formatDurationMs,
  formatRunCredits,
  matchesStatusFilter,
  resolveNodeRunDisplayStatus,
  runDurationMs,
  scopeLabel,
  sortNodeRunsByExecutionOrder,
} from "@/lib/runHistory/runHistoryDisplay";

type StatusFilter = "all" | "running" | "completed" | "failed";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const NODE_RUN_FETCH_DEBOUNCE_MS = 80;

function nodeRunDurationMs(nodeRun: NodeRun): number | null {
  if (!nodeRun.startedAt || !nodeRun.finishedAt) return null;
  return Math.max(
    0,
    new Date(nodeRun.finishedAt).getTime() - new Date(nodeRun.startedAt).getTime(),
  );
}

function formatRunStartedAt(run: WorkflowRun): string {
  const value = run.startedAt ?? run.createdAt;
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function runStatusTextClass(status: RunStatus): string {
  if (status === "SUCCESS") return "text-emerald-700 dark:text-emerald-400";
  if (status === "FAILED") return "text-red-600 dark:text-red-400";
  return "text-amber-700 dark:text-amber-400";
}

function nodeCardStatusClass(status: RunStatus): string {
  if (status === "SUCCESS") {
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30";
  }
  if (status === "FAILED") {
    return "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30";
  }
  return "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30";
}

function formatNodeRunError(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function collectAssetUrls(value: unknown): string[] {
  const urls: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) {
      urls.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (v && typeof v === "object") {
      for (const entry of Object.values(v as Record<string, unknown>)) visit(entry);
    }
  };
  visit(value);
  return [...new Set(urls)];
}

export function RunHistory({
  workflowId,
  execution,
  dispatch,
  onClose,
  runCompletedTick,
  onFocusNode,
  editorNodes = [],
}: {
  workflowId: string;
  execution: ExecutionState;
  dispatch: (action: ExecutionAction) => void;
  onClose: () => void;
  runCompletedTick: number;
  onFocusNode?: (nodeId: string) => void;
  editorNodes?: Node[];
}) {
  const { clientFetch } = useClientApi();
  const [manualError, setManualError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [nodeRuns, setNodeRuns] = useState<NodeRun[]>([]);
  const [loadingNodeRuns, setLoadingNodeRuns] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedInputs, setExpandedInputs] = useState<Record<string, boolean>>({});
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [nodeExecutionOrder, setNodeExecutionOrder] = useState<string[]>([]);

  const requestFieldLabelMaps = useMemo(
    () => buildRequestFieldLabelMaps(editorNodes),
    [editorNodes],
  );

  const selectedRunIdRef = useRef<string | null>(null);
  const fetchGenRef = useRef(0);
  const nodeRunsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpandedSections = useCallback(() => {
    setExpandedInputs({});
    setExpandedOutputs({});
    setExpandedLogs({});
  }, []);

  const fetchRuns = useCallback(async () => {
    setManualError(null);
    try {
      const res = await clientFetch(`/api/v1/workflows/${workflowId}/runs`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { runs: WorkflowRun[] };
      dispatch({ type: "history_set", history: json.runs });
    } catch (err) {
      setManualError(err instanceof Error ? err.message : String(err));
    }
  }, [workflowId, dispatch, clientFetch]);

  const fetchNodeRuns = useCallback(
    async (runId: string, options?: { showLoading?: boolean }) => {
      const gen = ++fetchGenRef.current;
      if (options?.showLoading !== false) setLoadingNodeRuns(true);
      try {
        const res = await clientFetch(`/api/v1/runs/${runId}`, { cache: "no-store" });
        const json = (await res.json()) as RunWithNodes;
        if (gen !== fetchGenRef.current || selectedRunIdRef.current !== runId) return;
        setNodeRuns((prev) => {
          const next = mergeDbNodeRunsIntoLive(prev, json.nodeRuns);
          return nodeRunsEqual(prev, next) ? prev : next;
        });
        dispatch({ type: "run_updated", run: json.run });
        dispatch({ type: "node_runs_received", runId, nodeRuns: json.nodeRuns });
      } catch (err) {
        if (gen !== fetchGenRef.current || selectedRunIdRef.current !== runId) return;
        setManualError(err instanceof Error ? err.message : String(err));
      } finally {
        if (gen === fetchGenRef.current) setLoadingNodeRuns(false);
      }
    },
    [dispatch, clientFetch],
  );

  const scheduleNodeRunsFetch = useCallback(
    (runId: string) => {
      if (nodeRunsDebounceRef.current) clearTimeout(nodeRunsDebounceRef.current);
      nodeRunsDebounceRef.current = setTimeout(() => {
        void fetchNodeRuns(runId, { showLoading: false });
      }, NODE_RUN_FETCH_DEBOUNCE_MS);
    },
    [fetchNodeRuns],
  );

  useEffect(() => {
    return () => {
      if (nodeRunsDebounceRef.current) clearTimeout(nodeRunsDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (execution.currentRunId) {
      selectedRunIdRef.current = execution.currentRunId;
      setSelectedRunId(execution.currentRunId);
    }
  }, [execution.currentRunId]);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns, runCompletedTick]);

  useEffect(() => {
    if (!selectedRunId) {
      fetchGenRef.current += 1;
      setNodeRuns([]);
      setNodeExecutionOrder([]);
      setLoadingNodeRuns(false);
      clearExpandedSections();
      return;
    }
    selectedRunIdRef.current = selectedRunId;
    setNodeRuns([]);
    clearExpandedSections();
    void fetchNodeRuns(selectedRunId);
  }, [selectedRunId, fetchNodeRuns, clearExpandedSections]);

  useEffect(() => {
    if (runCompletedTick === 0) return;
    if (selectedRunIdRef.current) {
      void fetchNodeRuns(selectedRunIdRef.current, { showLoading: false });
    }
  }, [runCompletedTick, fetchNodeRuns]);

  useEffect(() => {
    if (!filterOpen) return;
    const onMouseDown = () => setFilterOpen(false);
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [filterOpen]);

  const currentWorkflowRun = execution.currentRunId
    ? (execution.history.find((r) => r.id === execution.currentRunId) ?? null)
    : null;

  const handleRealtimeUpdate = useCallback(
    (payload: RunWithNodes) => {
      const isLive = isLiveOnlyPayload(payload.nodeRuns);
      const isTerminalRun =
        payload.run.status === "SUCCESS" ||
        payload.run.status === "FAILED" ||
        payload.run.status === "CANCELLED";

      // Live in-progress updates force parent run to RUNNING; terminal status is kept.
      const run: WorkflowRun =
        isLive && !isTerminalRun && payload.run.status !== "RUNNING"
          ? { ...payload.run, status: "RUNNING" }
          : payload.run;

      dispatch({ type: "run_updated", run });
      dispatch({ type: "node_runs_received", runId: payload.run.id, nodeRuns: payload.nodeRuns });

      if (selectedRunIdRef.current !== payload.run.id) return;

      if (isLive) {
        if (payload.nodeRuns.length > 0) {
          setNodeExecutionOrder((prev) => {
            const next = payload.nodeRuns.map((nr) => nr.nodeId);
            return prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next;
          });
        }
        setNodeRuns((prev) => {
          const next = upsertLiveNodeRuns(prev, payload.nodeRuns);
          return nodeRunsEqual(prev, next) ? prev : next;
        });
        scheduleNodeRunsFetch(payload.run.id);
        return;
      }

      setNodeRuns((prev) => {
        const next = mergeDbNodeRunsIntoLive(prev, payload.nodeRuns);
        return nodeRunsEqual(prev, next) ? prev : next;
      });
      setLoadingNodeRuns(false);
    },
    [dispatch, scheduleNodeRunsFetch],
  );

  useWorkflowRunRealtime({
    workflowRunId: execution.currentRunId,
    workflowRun: currentWorkflowRun,
    enabled: Boolean(execution.currentRunId),
    onUpdate: handleRealtimeUpdate,
  });

  const filteredRuns = useMemo(
    () => execution.history.filter((run) => matchesStatusFilter(run, statusFilter)),
    [execution.history, statusFilter],
  );

  const displayedNodeRuns = useMemo(
    () => sortNodeRunsByExecutionOrder(nodeRuns, nodeExecutionOrder),
    [nodeRuns, nodeExecutionOrder],
  );

  const filterLabel =
    FILTER_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? "All";

  const toggleRunSelection = (runId: string) => {
    if (selectedRunId === runId) {
      selectedRunIdRef.current = null;
      fetchGenRef.current += 1;
      setSelectedRunId(null);
      setNodeRuns([]);
      clearExpandedSections();
      return;
    }
    selectedRunIdRef.current = runId;
    setSelectedRunId(runId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-[1] border-b border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Execution History</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[18px] px-3 text-xs font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-zinc-300 dark:hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <span className="text-xs font-medium text-gray-600 dark:text-zinc-300">Run history</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await fetchRuns();
                if (selectedRunIdRef.current) {
                  await fetchNodeRuns(selectedRunIdRef.current);
                }
                setRefreshing(false);
              }}
              disabled={refreshing}
              aria-label="Refresh run history"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                role="combobox"
                aria-expanded={filterOpen}
                aria-haspopup="listbox"
                aria-controls="run-filter-listbox"
                onClick={() => setFilterOpen((open) => !open)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {filterLabel}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {filterOpen ? (
                <ul
                  id="run-filter-listbox"
                  role="listbox"
                  className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {FILTER_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={statusFilter === opt.value}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setFilterOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[11px] text-gray-700 hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-700/60"
                      >
                        <span>{opt.label}</span>
                        {statusFilter === opt.value ? <Check size={12} /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        {manualError ? (
          <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-mono text-[10px] leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {manualError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 [scrollbar-gutter:stable]">
          {filteredRuns.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-[11px] text-gray-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400">
              No runs for this filter yet.
            </div>
          ) : (
            <ul className="min-w-0 space-y-2">
              {filteredRuns.map((run) => {
                const isSelected = selectedRunId === run.id;
                const statusId = `run-status-${run.id}`;
                const regionId = `run-node-runs-${run.id}`;
                const runCredits = formatRunCredits(run);
                return (
                  <li key={run.id} className="min-w-0 contain-layout">
                    <div
                      className={[
                        "min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800",
                        isSelected ? "ring-1 ring-gray-200 dark:ring-zinc-600" : "",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        aria-expanded={isSelected}
                        aria-controls={regionId}
                        onClick={() => toggleRunSelection(run.id)}
                        className="w-full min-w-0 overflow-hidden px-3 pb-2.5 pt-2.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            id={statusId}
                            className={`text-[11px] font-semibold tabular-nums ${runStatusTextClass(run.status)}`}
                          >
                            {run.status}
                          </span>
                          <span className="shrink-0 text-[11px] text-gray-500 dark:text-zinc-400">
                            {scopeLabel(run.scope)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
                          {formatRunStartedAt(run)}
                        </div>
                        <div className="mt-0.5 min-h-[1rem] text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
                          {formatDurationMs(runDurationMs(run))}
                        </div>
                        {runCredits ? (
                          <div className="mt-0.5 text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
                            {runCredits}
                          </div>
                        ) : null}
                      </button>
                    </div>

                    {isSelected ? (
                      <div
                        id={regionId}
                        role="region"
                        aria-labelledby={statusId}
                        className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/80"
                      >
                        {loadingNodeRuns && nodeRuns.length === 0 ? (
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                            Loading node runs…
                          </p>
                        ) : displayedNodeRuns.length === 0 ? (
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                            No node run details available yet.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {displayedNodeRuns.map((nr) => (
                              <li key={nr.nodeId}>
                                <NodeRunCard
                                  nodeRun={nr}
                                  requestFieldLabels={requestFieldLabelMaps.get(nr.nodeId)}
                                  inputsExpanded={Boolean(expandedInputs[nr.nodeId])}
                                  outputExpanded={Boolean(expandedOutputs[nr.nodeId])}
                                  logsExpanded={Boolean(expandedLogs[nr.nodeId])}
                                  onToggleInputs={() =>
                                    setExpandedInputs((prev) => ({
                                      ...prev,
                                      [nr.nodeId]: !prev[nr.nodeId],
                                    }))
                                  }
                                  onToggleOutput={() =>
                                    setExpandedOutputs((prev) => ({
                                      ...prev,
                                      [nr.nodeId]: !prev[nr.nodeId],
                                    }))
                                  }
                                  onToggleLogs={() =>
                                    setExpandedLogs((prev) => ({
                                      ...prev,
                                      [nr.nodeId]: !prev[nr.nodeId],
                                    }))
                                  }
                                  onFocusNode={onFocusNode}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const NodeRunCard = memo(function NodeRunCard({
  nodeRun,
  requestFieldLabels,
  inputsExpanded,
  outputExpanded,
  logsExpanded,
  onToggleInputs,
  onToggleOutput,
  onToggleLogs,
  onFocusNode,
}: {
  nodeRun: NodeRun;
  requestFieldLabels?: Record<string, string>;
  inputsExpanded: boolean;
  outputExpanded: boolean;
  logsExpanded: boolean;
  onToggleInputs: () => void;
  onToggleOutput: () => void;
  onToggleLogs: () => void;
  onFocusNode?: (nodeId: string) => void;
}) {
  const displayStatus = resolveNodeRunDisplayStatus(nodeRun);
  const title = nodeRun.nodeType || nodeRun.nodeId.slice(0, 12);
  const duration = formatDurationMs(nodeRunDurationMs(nodeRun));
  const ioFormatOptions =
    nodeRun.nodeType === "request" && requestFieldLabels
      ? { requestFieldLabels }
      : undefined;
  const inputText = formatNodeRunInputForDisplay(
    nodeRun.input ?? nodeRun.resolvedInput,
    ioFormatOptions,
  );
  const hasOutput = nodeRun.output != null || nodeRun.resolvedOutput != null;
  const outputValue = nodeRun.output ?? nodeRun.resolvedOutput;
  const formattedOutputText = formatNodeRunInputForDisplay(outputValue, ioFormatOptions);
  const errorText = formatNodeRunError(nodeRun.error);
  const logText = nodeRun.logPreview ?? "";
  const assetUrls = collectAssetUrls(outputValue);
  const creditValue = nodeRun.actualCredits ?? nodeRun.estimatedCredits;
  const credits = creditValue != null ? String(creditValue) : null;
  const isFailed = displayStatus === "FAILED";

  return (
    <div className={`rounded-lg border p-2.5 ${nodeCardStatusClass(displayStatus)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-gray-900 dark:text-zinc-100">
            {title}
          </div>
          <div className="font-mono text-[10px] text-gray-500 dark:text-zinc-400">
            {nodeRun.nodeId}
          </div>
        </div>
        <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${runStatusTextClass(displayStatus)}`}>
          {displayStatus}
        </span>
      </div>
      {isFailed && onFocusNode ? (
        <button
          type="button"
          onClick={() => onFocusNode(nodeRun.nodeId)}
          className="mt-1 text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Show on canvas
        </button>
      ) : null}
      <div className="mt-1 flex min-h-[1rem] flex-wrap items-center gap-2 text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
        <span>{duration}</span>
        {nodeRun.provider ? <span>via {nodeRun.provider}</span> : null}
        {credits ? <span>{credits} credits</span> : null}
      </div>

      {nodeRun.providerAttempts && nodeRun.providerAttempts.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
            Provider attempts
          </p>
          <ul className="space-y-1">
            {nodeRun.providerAttempts.map((attempt) => (
              <li
                key={attempt.id}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[10px] leading-relaxed text-gray-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{attempt.provider}</span>
                  <span>{attempt.status}</span>
                </div>
                {attempt.errorCode ? (
                  <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-400">
                    {attempt.errorCode}
                  </p>
                ) : null}
                {attempt.durationMs != null ? <span>{attempt.durationMs}ms</span> : null}
                {attempt.error ? (
                  <p className="mt-0.5 cursor-text select-text break-all text-red-600 dark:text-red-400">
                    {attempt.error}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {logText ? (
        <IoBlock
          label="Logs"
          text={logText}
          expanded={logsExpanded}
          onToggle={onToggleLogs}
          collapsedMaxClass="max-h-[120px]"
          expandLabel="Expand logs"
          collapseLabel="Collapse logs"
        />
      ) : null}

      <IoBlock
        label="Inputs used"
        text={inputText}
        expanded={inputsExpanded}
        onToggle={onToggleInputs}
        collapsedMaxClass="max-h-[140px]"
        expandLabel="Expand inputs"
        collapseLabel="Collapse inputs"
      />

      {hasOutput ? (
        <IoBlock
          label="Output"
          text={formattedOutputText}
          expanded={outputExpanded}
          onToggle={onToggleOutput}
          collapsedMaxClass="max-h-[120px]"
          expandLabel="Expand output"
          collapseLabel="Collapse output"
        />
      ) : null}

      {assetUrls.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
            Assets
          </p>
          <ul className="space-y-1">
            {assetUrls.map((url) => (
              <li key={url} className="flex items-center gap-2 text-[10px]">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-blue-600 hover:underline dark:text-blue-400"
                >
                  View asset
                </a>
                <a
                  href={url}
                  download
                  className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {errorText ? (
        <pre className="mt-2 cursor-text select-text overflow-auto whitespace-pre-wrap break-all rounded-md border border-red-200 bg-red-50 p-2 font-mono text-[10px] leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {errorText}
        </pre>
      ) : null}
    </div>
  );
});

function IoBlock({
  label,
  text,
  expanded,
  onToggle,
  collapsedMaxClass,
  expandLabel,
  collapseLabel,
}: {
  label: string;
  text: string;
  expanded: boolean;
  onToggle: () => void;
  collapsedMaxClass: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
          {label}
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? collapseLabel : expandLabel}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-white/70 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
        >
          {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
        </button>
      </div>
      <pre
        className={[
          "overflow-auto whitespace-pre-wrap break-all rounded-md border border-gray-200 bg-white p-2 font-mono text-[10px] leading-relaxed text-gray-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200",
          expanded ? "" : collapsedMaxClass,
        ].join(" ")}
      >
        {text}
      </pre>
    </div>
  );
}
