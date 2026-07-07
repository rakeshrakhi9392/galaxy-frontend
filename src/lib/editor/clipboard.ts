import type { Edge, Node } from "reactflow";
import { createEdgeId, createFieldId, createNodeId } from "./graphUtils";

function stripScaffoldFlag(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  delete next.scaffold;
  return next;
}

function refreshRequestFieldIds(data: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(data.dynamicFields)) return data;
  return {
    ...data,
    dynamicFields: data.dynamicFields.map((field, index) => {
      const record =
        field && typeof field === "object" ? (field as Record<string, unknown>) : {};
      return {
        ...record,
        id: createFieldId(),
        name: typeof record.name === "string" ? record.name : index === 0 ? "Input" : "Input",
        type: typeof record.type === "string" ? record.type : "text",
        value: typeof record.value === "string" ? record.value : "",
      };
    }),
  };
}

export type ClipboardPayload = { nodes: Node[]; edges: Edge[] };

export function duplicateSingleNode(
  nodes: Node[],
  edges: Edge[],
  nodeId: string,
  withEdges: boolean,
  offset = 40,
): { nodes: Node[]; edges: Edge[] } {
  const { nodes: dupNodes } = duplicateNodes(nodes, edges, [nodeId], offset);
  if (!withEdges || dupNodes.length === 0) {
    return { nodes: dupNodes, edges: [] };
  }

  const newId = dupNodes[0]!.id;
  const dupEdges = edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => {
      const source = edge.source === nodeId ? newId : edge.source;
      const target = edge.target === nodeId ? newId : edge.target;
      return {
        ...(JSON.parse(JSON.stringify(edge)) as Edge),
        id: createEdgeId(source, target, edge.sourceHandle),
        source,
        target,
        selected: false,
      };
    });

  return { nodes: dupNodes, edges: dupEdges };
}

export function duplicateNodes(
  nodes: Node[],
  edges: Edge[],
  selectedIds: string[],
  offset = 40,
): { nodes: Node[]; edges: Edge[] } {
  const idMap = new Map<string, string>();
  for (const id of selectedIds) {
    idMap.set(id, createNodeId());
  }

  const newNodes = nodes
    .filter((n) => selectedIds.includes(n.id))
    .map((n) => {
      const rawData = (n.data ?? {}) as Record<string, unknown>;
      const data =
        n.type === "request"
          ? refreshRequestFieldIds(stripScaffoldFlag(rawData))
          : stripScaffoldFlag(rawData);
      return {
        ...JSON.parse(JSON.stringify(n)) as Node,
        id: idMap.get(n.id)!,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        selected: true,
        deletable: true,
        data,
      };
    });

  const newEdges = edges
    .filter((e) => selectedIds.includes(e.source) && selectedIds.includes(e.target))
    .map((e) => {
      const source = idMap.get(e.source)!;
      const target = idMap.get(e.target)!;
      return {
        ...JSON.parse(JSON.stringify(e)) as Edge,
        id: createEdgeId(source, target, e.sourceHandle),
        source,
        target,
        selected: true,
      };
    });

  return { nodes: newNodes, edges: newEdges };
}

export function pasteClipboard(
  clipboard: ClipboardPayload,
  offset = 40,
): { nodes: Node[]; edges: Edge[] } {
  const idMap = new Map<string, string>();
  for (const n of clipboard.nodes) {
    idMap.set(n.id, createNodeId());
  }

  const nodes = clipboard.nodes.map((n) => {
    const rawData = (n.data ?? {}) as Record<string, unknown>;
    const data =
      n.type === "request"
        ? refreshRequestFieldIds(stripScaffoldFlag(rawData))
        : stripScaffoldFlag(rawData);
    return {
      ...JSON.parse(JSON.stringify(n)) as Node,
      id: idMap.get(n.id)!,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: true,
      deletable: true,
      data,
    };
  });

  const edges = clipboard.edges.map((e) => {
    const source = idMap.get(e.source)!;
    const target = idMap.get(e.target)!;
    return {
      ...JSON.parse(JSON.stringify(e)) as Edge,
      id: createEdgeId(source, target, e.sourceHandle),
      source,
      target,
      selected: true,
    };
  });

  return { nodes, edges };
}
