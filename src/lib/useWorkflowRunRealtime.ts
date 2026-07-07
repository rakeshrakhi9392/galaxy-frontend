"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useClientApi } from "./useClientApi";
import type { NodeRun, RunStatus, RunWithNodes, WorkflowRun } from "./types";
import { applyDisconnectedRunFailure, canUseTriggerRealtime } from "./workflowRunRealtimePolicy";

type RealtimeCredentials = {
  triggerRunId: string;
  publicAccessToken: string;
};

function mapTriggerStatus(status?: string): RunStatus {
  switch (status) {
    case "COMPLETED":
      return "SUCCESS";
    case "FAILED":
    case "CRASHED":
    case "SYSTEM_FAILURE":
      return "FAILED";
    case "CANCELED":
      return "CANCELLED";
    case "QUEUED":
    case "WAITING":
      return "QUEUED";
    default:
      return "RUNNING";
  }
}

function metadataStatus(metadata: Record<string, unknown> | undefined): RunStatus | null {
  const raw = metadata?.status;
  if (raw === "SUCCESS" || raw === "FAILED" || raw === "RUNNING" || raw === "QUEUED") {
    return raw;
  }
  return null;
}

function serializeNodeStatuses(metadata: Record<string, unknown> | undefined): string {
  const nodeStatuses = metadata?.nodeStatuses;
  if (!nodeStatuses || typeof nodeStatuses !== "object") return "";
  return JSON.stringify(nodeStatuses);
}

function parseNodeExecutionOrder(metadata: Record<string, unknown> | undefined): string[] {
  const raw = metadata?.nodeExecutionOrder;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

function orderedNodeIds(
  nodeStatuses: Record<string, RunStatus>,
  executionOrder: string[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const nodeId of executionOrder) {
    if (nodeId in nodeStatuses && !seen.has(nodeId)) {
      ids.push(nodeId);
      seen.add(nodeId);
    }
  }

  for (const nodeId of Object.keys(nodeStatuses)) {
    if (!seen.has(nodeId)) {
      ids.push(nodeId);
      seen.add(nodeId);
    }
  }

  return ids;
}

export function useWorkflowRunRealtime(args: {
  workflowRunId: string | null;
  workflowRun: WorkflowRun | null;
  enabled: boolean;
  onUpdate: (payload: RunWithNodes) => void;
  onSnapshotError?: (message: string) => void;
}) {
  const { clientFetch } = useClientApi();
  const [creds, setCreds] = useState<RealtimeCredentials | null>(null);
  const lastFetchRef = useRef(0);
  const lastLiveSignatureRef = useRef<string>("");
  const onUpdateRef = useRef(args.onUpdate);
  const onSnapshotErrorRef = useRef(args.onSnapshotError);
  const workflowRunRef = useRef(args.workflowRun);

  onUpdateRef.current = args.onUpdate;
  onSnapshotErrorRef.current = args.onSnapshotError;
  workflowRunRef.current = args.workflowRun;

  const triggerRunId = args.workflowRun?.triggerRunId ?? null;

  useEffect(() => {
    if (!args.enabled || !args.workflowRunId || !triggerRunId) {
      setCreds(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await clientFetch(`/api/v1/runs/${args.workflowRunId}/realtime-token`);
        const json = (await res.json()) as RealtimeCredentials;
        if (!cancelled) setCreds(json);
      } catch (err) {
        if (!cancelled) {
          setCreds(null);
          onSnapshotErrorRef.current?.(
            err instanceof Error
              ? err.message
              : "Could not connect to run updates. Check your network and try again.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [args.enabled, args.workflowRunId, triggerRunId, clientFetch]);

  const { run: triggerRun } = useRealtimeRun(creds?.triggerRunId ?? "", {
    accessToken: creds?.publicAccessToken ?? "",
    enabled: Boolean(creds?.triggerRunId && creds?.publicAccessToken),
  });

  useEffect(() => {
    lastLiveSignatureRef.current = "";
    lastFetchRef.current = 0;
  }, [args.workflowRunId]);

  useEffect(() => {
    if (!args.enabled || !args.workflowRunId) return;

    const fetchRunSnapshot = async (): Promise<RunWithNodes> => {
      const workflowRunId = args.workflowRunId;
      if (!workflowRunId) throw new Error("workflowRunId required");
      const res = await clientFetch(`/api/v1/runs/${workflowRunId}`);
      return (await res.json()) as RunWithNodes;
    };

    const reportSnapshotError = (err: unknown) => {
      onSnapshotErrorRef.current?.(
        err instanceof Error
          ? err.message
          : "Could not refresh run details. Check your network and try again.",
      );
    };

    const workflowRun = workflowRunRef.current;
    if (!workflowRun) return;

    if (!canUseTriggerRealtime(workflowRun)) {
      void fetchRunSnapshot()
        .then((json) => {
          onUpdateRef.current(applyDisconnectedRunFailure(json));
        })
        .catch(reportSnapshotError);
      return;
    }

    if (!triggerRun) return;

    const metadata = triggerRun.metadata as Record<string, unknown> | undefined;
    const status = metadataStatus(metadata) ?? mapTriggerStatus(triggerRun.status);
    const nodeExecutionOrder = parseNodeExecutionOrder(metadata);
    const nodeStatusesSignature = serializeNodeStatuses(metadata);
    const liveSignature = `${status}|${nodeStatusesSignature}|${nodeExecutionOrder.join(",")}|${String(metadata?.errorSummary ?? "")}`;

    if (liveSignature !== lastLiveSignatureRef.current) {
      lastLiveSignatureRef.current = liveSignature;

      const base = workflowRunRef.current ?? workflowRun;
      const optimisticRun: WorkflowRun = {
        ...base,
        status,
        errorSummary:
          status === "FAILED"
            ? String(metadata?.errorSummary ?? base.errorSummary ?? "Run failed")
            : status === "SUCCESS"
              ? null
              : base.errorSummary,
      };

      const nodeStatuses = metadata?.nodeStatuses;
      const nodeTypes =
        metadata?.nodeTypes && typeof metadata.nodeTypes === "object"
          ? (metadata.nodeTypes as Record<string, string>)
          : {};

      if (nodeStatuses && typeof nodeStatuses === "object") {
        const statuses = nodeStatuses as Record<string, RunStatus>;
        const nodeIds = orderedNodeIds(statuses, nodeExecutionOrder);
        onUpdateRef.current({
          run: optimisticRun,
          nodeRuns: nodeIds.map((nodeId) => ({
              id: `${args.workflowRunId}-${nodeId}`,
              workflowRunId: args.workflowRunId!,
              nodeId,
              nodeType: nodeTypes[nodeId] ?? "unknown",
              attempt: 1,
              status: statuses[nodeId]!,
              startedAt: null,
              finishedAt: null,
              resolvedInput: null,
              resolvedOutput: null,
              input: null,
              output: null,
              provider: null,
              error: null,
              estimatedCredits: null,
              actualCredits: null,
              createdAt: optimisticRun.updatedAt,
              updatedAt: optimisticRun.updatedAt,
            })),
        });
      } else {
        onUpdateRef.current({
          run: optimisticRun,
          nodeRuns: [],
        });
      }
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 400) return;
    lastFetchRef.current = now;
    void fetchRunSnapshot()
      .then((json) => {
        onUpdateRef.current(json);
      })
      .catch(reportSnapshotError);
  }, [args.enabled, args.workflowRunId, triggerRunId, triggerRun, clientFetch]);

  return { usingRealtime: Boolean(creds?.triggerRunId) };
}
