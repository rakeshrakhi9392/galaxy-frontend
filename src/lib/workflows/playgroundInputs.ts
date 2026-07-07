import {
  estimateWorkflowCredits,
  formatWorkflowCreditEstimate,
} from "@/lib/editor/estimateNodeCredits";

export type PlaygroundInput = {
  id: string;
  nodeId: string;
  fieldId: string;
  label: string;
  type: "text";
  placeholder: string;
};

type DynamicField = {
  id: string;
  name: string;
  type: string;
  value: string;
};

type GraphNode = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

type WorkflowGraphLike = {
  nodes?: GraphNode[];
  edges?: unknown[];
};

function graphNodes(graph: unknown): GraphNode[] {
  const parsed = graph as WorkflowGraphLike & { graph?: WorkflowGraphLike };
  if (Array.isArray(parsed?.nodes)) return parsed.nodes;
  if (Array.isArray(parsed?.graph?.nodes)) return parsed.graph.nodes;
  return [];
}

export function extractPlaygroundInputs(graph: unknown): PlaygroundInput[] {
  const inputs: PlaygroundInput[] = [];

  for (const node of graphNodes(graph)) {
    if (node.type !== "request") continue;

    const fields = node.data?.dynamicFields;
    if (!Array.isArray(fields)) continue;

    for (const field of fields as DynamicField[]) {
      if (!field?.id) continue;
      inputs.push({
        id: `${node.id}:${field.id}`,
        nodeId: node.id,
        fieldId: field.id,
        label: field.name || "Input",
        type: "text",
        placeholder: `Enter ${field.name || "input"}...`,
      });
    }
  }

  return inputs;
}

export function getPlaygroundInputValues(
  graph: unknown,
  inputs: PlaygroundInput[],
): Record<string, string> {
  const nodes = graphNodes(graph);
  const values: Record<string, string> = {};

  for (const input of inputs) {
    const node = nodes.find((n) => n.id === input.nodeId);
    const fields = node?.data?.dynamicFields;
    if (!Array.isArray(fields)) {
      values[input.id] = "";
      continue;
    }
    const field = (fields as DynamicField[]).find((item) => item.id === input.fieldId);
    values[input.id] = typeof field?.value === "string" ? field.value : "";
  }

  return values;
}

export function applyPlaygroundInputsToGraph(
  graph: unknown,
  values: Record<string, string>,
): unknown {
  const base = graph as WorkflowGraphLike & { graph?: WorkflowGraphLike };
  const usesFlat = Array.isArray(base.nodes);
  const next = structuredClone(graph) as WorkflowGraphLike & { graph?: WorkflowGraphLike };
  const nodes = usesFlat ? next.nodes : next.graph?.nodes;
  if (!Array.isArray(nodes)) return graph;

  for (const [key, value] of Object.entries(values)) {
    const [nodeId, fieldId] = key.split(":");
    if (!nodeId || !fieldId) continue;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const fields = Array.isArray(node.data?.dynamicFields)
      ? [...(node.data.dynamicFields as DynamicField[])]
      : [];
    const index = fields.findIndex((field) => field.id === fieldId);
    if (index === -1) continue;
    fields[index] = { ...fields[index], value };
    node.data = { ...(node.data ?? {}), dynamicFields: fields };
  }

  return next;
}

export function estimatePlaygroundCredits(graph: unknown): string {
  return formatWorkflowCreditEstimate(estimateWorkflowCredits(graphNodes(graph)));
}

export function workflowGraphPayload(graph: unknown): { nodes: GraphNode[]; edges: unknown[] } {
  const parsed = graph as WorkflowGraphLike & { graph?: WorkflowGraphLike };
  if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
    return { nodes: parsed.nodes, edges: parsed.edges };
  }
  return {
    nodes: Array.isArray(parsed.graph?.nodes) ? parsed.graph.nodes : [],
    edges: Array.isArray(parsed.graph?.edges) ? parsed.graph.edges : [],
  };
}
