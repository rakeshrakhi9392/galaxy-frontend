import type { Edge, Node } from "reactflow";
import { hasCycle as sharedHasCycle, isScaffoldNode } from "@galaxy/schemas";

export type GraphSnapshot = { nodes: Node[]; edges: Edge[]; viewport?: { x: number; y: number; zoom: number } };

/** Ensures nodes are draggable from the full body (interactive children use nodrag). */
export function ensureNodeInteractionDefaults(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const locked = (node.data as { locked?: boolean }).locked === true;
    const scaffold = isScaffoldNode(node);
    const { dragHandle: _legacyDragHandle, ...rest } = node;
    const next: Node = {
      ...rest,
      selected: node.selected === true,
      draggable: locked ? false : node.draggable !== false,
      connectable: locked ? false : node.connectable !== false,
      deletable: scaffold ? false : node.deletable !== false,
    };

    // Request-Inputs must always present at least one field (never an empty shell).
    if (node.type === "request") {
      const data = (node.data ?? {}) as { dynamicFields?: unknown[] };
      if (!Array.isArray(data.dynamicFields) || data.dynamicFields.length === 0) {
        next.data = {
          ...data,
          dynamicFields: [
            { id: createFieldId(), name: "Input", type: "text", value: "" },
          ],
        };
      }
    }

    return next;
  });
}

export function cloneGraph(snapshot: GraphSnapshot): GraphSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GraphSnapshot;
}

const EPHEMERAL_NODE_KEYS = new Set([
  "selected",
  "dragging",
  "measured",
  "width",
  "height",
  "resizing",
  "liveExecutionStatus",
]);

/** Run-time previews — never persist to the workflow document. */
const EPHEMERAL_DATA_KEYS = ["liveExecutionStatus", "lastOutput", "results"] as const;

export function stripExecutionOutputsFromNodeData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };
  for (const key of EPHEMERAL_DATA_KEYS) {
    delete next[key];
  }
  return next;
}

/** Remove hydrated run outputs from canvas nodes (e.g. before a new run or after graph edits). */
export function stripExecutionOutputs(nodes: Node[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    data: stripExecutionOutputsFromNodeData((node.data ?? {}) as Record<string, unknown>),
  }));
}

export function stripEphemeralNodeState(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const next = { ...node };
    for (const key of EPHEMERAL_NODE_KEYS) {
      delete (next as Record<string, unknown>)[key];
    }
    const data = stripExecutionOutputsFromNodeData((node.data ?? {}) as Record<string, unknown>);
    return { ...next, data };
  });
}

/** @deprecated Use stripEphemeralNodeState */
export function stripExecutionState(nodes: Node[]): Node[] {
  return stripEphemeralNodeState(nodes);
}

export function hasCycle(nodes: Node[], edges: Edge[], candidate: Edge): boolean {
  return sharedHasCycle(
    nodes as Parameters<typeof sharedHasCycle>[0],
    edges,
    candidate,
  );
}

/** True when the stored graph already contains a directed cycle. */
export function graphContainsCycle(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length === 0) return false;
  return sharedHasCycle(nodes as Parameters<typeof sharedHasCycle>[0], edges);
}

export function getSelectedNodeIds(nodes: Node[]): string[] {
  return nodes.filter((n) => n.selected).map((n) => n.id);
}

export function createNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEdgeId(source: string, target: string, sourceHandle?: string | null): string {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${source}_${target}_${sourceHandle ?? "default"}`;
}

export function workflowToGraph(workflow: unknown): GraphSnapshot {
  const parsed = workflow as {
    nodes?: Node[];
    edges?: Edge[];
    graph?: { nodes?: Node[]; edges?: Edge[]; viewport?: GraphSnapshot["viewport"] };
  };
  if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
    const doc = parsed as { viewport?: GraphSnapshot["viewport"] };
    return {
      nodes: parsed.nodes as Node[],
      edges: parsed.edges as Edge[],
      ...(doc.viewport ? { viewport: doc.viewport } : {}),
    };
  }
  const graph = parsed.graph;
  return {
    nodes: Array.isArray(graph?.nodes) ? (graph.nodes as Node[]) : [],
    edges: Array.isArray(graph?.edges) ? (graph.edges as Edge[]) : [],
    viewport: graph?.viewport,
  };
}
