"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { graphFromUnknown } from "@galaxy/schemas";
import { useClientApi } from "@/lib/useClientApi";
import { stripEphemeralNodeState } from "@/lib/editor/graphUtils";

const ESTIMATE_DEBOUNCE_MS = 280;

type WorkflowCreditEstimateResponse = {
  totalMicrocredits: number;
  estimates: Array<{ microcredits: number }>;
};

function buildEstimateGraph(nodes: Node[], edges: Edge[]) {
  return graphFromUnknown({
    nodes: stripEphemeralNodeState(nodes),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle, type }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: type ?? "default",
    })),
  });
}

export function useWorkflowCreditEstimate(args: {
  nodes: Node[];
  edges: Edge[];
  /** Empty = full workflow; non-empty = same closure as Run Selection. */
  targetNodeIds: string[];
  enabled?: boolean;
}) {
  const { clientFetch } = useClientApi();
  const [totalMicrocredits, setTotalMicrocredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const targetNodeIds = useMemo(
    () => [...new Set(args.targetNodeIds)].sort(),
    [args.targetNodeIds],
  );

  const graphKey = useMemo(() => {
    const graph = buildEstimateGraph(args.nodes, args.edges);
    return JSON.stringify({ graph, targetNodeIds });
  }, [args.nodes, args.edges, targetNodeIds]);

  useEffect(() => {
    if (args.enabled === false) {
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const graph = buildEstimateGraph(args.nodes, args.edges);
          const res = await clientFetch("/api/v1/workflows/estimate-credits", {
            method: "POST",
            body: JSON.stringify({ graph, targetNodeIds }),
          });
          if (requestId !== requestIdRef.current) return;
          if (!res.ok) return;

          const json = (await res.json()) as WorkflowCreditEstimateResponse;
          setTotalMicrocredits(json.totalMicrocredits);
        } catch {
          // Keep last known estimate on transient errors.
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        }
      })();
    }, ESTIMATE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [args.enabled, args.nodes, args.edges, clientFetch, graphKey, targetNodeIds]);

  return { totalMicrocredits, loading };
}
