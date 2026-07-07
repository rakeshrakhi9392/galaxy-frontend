"use client";

import { useMemo } from "react";
import { useStore, type Edge, type Node } from "reactflow";
import { buildWiredFieldView, type WiredFieldView } from "./wiredFields";

/** Stable fallbacks so selectors don't allocate a new [] on every undefined read. */
const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export function useWiredField(nodeId: string, handleId: string): WiredFieldView {
  const nodeInternals = useStore((state) => state.nodeInternals);
  const edges = useStore((state) => state.edges ?? EMPTY_EDGES);

  const nodes = useMemo(() => {
    if (!nodeInternals?.size) return EMPTY_NODES;
    return Array.from(nodeInternals.values());
  }, [nodeInternals]);

  return useMemo(
    () => buildWiredFieldView(nodes, edges, nodeId, handleId),
    [nodes, edges, nodeId, handleId],
  );
}
