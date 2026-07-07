import type { Edge, Node } from "reactflow";
import {
  countWiredInputsForField,
  isProviderLimitNodeType,
  validateProviderLimitsFromHints,
  type ProviderLimitValidationOptions,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
} from "@galaxy/schemas";
import type { clientFetch } from "@/lib/backend";
import {
  resolveNodeInputsForValidation,
  resolveRunValidationTargets,
  type NodeValidationIssue,
  type ValidateNodeInputsContext,
} from "./validateNodeInputs";
import { getNodeDefinition } from "@/generated/nodeRegistry";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nodeLabel(node: Node): string {
  const data = asRecord(node.data);
  if (typeof data.label === "string" && data.label.length > 0) return data.label;
  const def = getNodeDefinition(node.type);
  return def?.ui.title ?? node.type ?? node.id;
}

function toWorkflowGraph(nodes: Node[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes as WorkflowNode[],
    edges: edges.map(
      (edge): WorkflowEdge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      }),
    ),
  };
}

function wiredInputCountsForNode(
  node: Node,
  context?: ValidateNodeInputsContext,
): ProviderLimitValidationOptions["wiredInputCounts"] {
  if (!context || context.nodes.length === 0) return undefined;

  const graph = toWorkflowGraph(context.nodes, context.edges);
  if (node.type === "merge-video") {
    const count = countWiredInputsForField(graph, node.id, "video_urls");
    return count > 0 ? { video_urls: count } : undefined;
  }

  return undefined;
}

function limitIssuesFromHints(node: Node, context?: ValidateNodeInputsContext): NodeValidationIssue[] {
  const nodeType = node.type;
  if (!nodeType || !isProviderLimitNodeType(nodeType)) return [];

  const schema = getNodeDefinition(nodeType)?.input;
  if (!schema) return [];

  const resolved = resolveNodeInputsForValidation(node, context);
  const parsed = schema.safeParse(resolved);
  if (!parsed.success) return [];

  const label = nodeLabel(node);
  const options: ProviderLimitValidationOptions = {
    wiredInputCounts: wiredInputCountsForNode(node, context),
  };

  return validateProviderLimitsFromHints(nodeType, parsed.data, options).map((violation) => ({
    nodeId: node.id,
    nodeType,
    label,
    message: violation.message,
  }));
}

export function validateProviderLimitsFromHintsForNode(
  node: Node,
  context?: ValidateNodeInputsContext,
): NodeValidationIssue[] {
  return limitIssuesFromHints(node, context);
}

export function validateProviderLimitsFromHintsForNodes(
  nodes: Node[],
  context?: ValidateNodeInputsContext,
): NodeValidationIssue[] {
  const validationContext = context ?? { nodes, edges: [] };
  return nodes.flatMap((node) => limitIssuesFromHints(node, validationContext));
}

export async function validateProviderLimitsForRun(
  fetchFn: typeof clientFetch,
  nodes: Node[],
  selectedNodeIds?: string[],
  edges: Edge[] = [],
): Promise<NodeValidationIssue[]> {
  const targets = resolveRunValidationTargets(nodes, edges, selectedNodeIds);

  const context = { nodes, edges };
  const graph = toWorkflowGraph(nodes, edges);
  const candidates = targets.filter(
    (node) => node.type && isProviderLimitNodeType(node.type),
  );
  if (candidates.length === 0) return [];

  const payload = candidates.flatMap((node) => {
    const nodeType = node.type!;
    const schema = getNodeDefinition(nodeType)?.input;
    if (!schema) return [];

    const resolved = resolveNodeInputsForValidation(node, context);
    const parsed = schema.safeParse(resolved);
    if (!parsed.success) return [];

    const wiredInputCounts =
      nodeType === "merge-video"
        ? (() => {
            const count = countWiredInputsForField(graph, node.id, "video_urls");
            return count > 0 ? { video_urls: count } : undefined;
          })()
        : undefined;

    return [
      {
        nodeId: node.id,
        nodeType,
        label: nodeLabel(node),
        inputs: parsed.data as Record<string, unknown>,
        ...(wiredInputCounts ? { wiredInputCounts } : {}),
      },
    ];
  });

  if (payload.length === 0) return [];

  const res = await fetchFn("/api/v1/workflows/validate-limits", {
    method: "POST",
    body: JSON.stringify({ nodes: payload }),
  });

  const json = (await res.json()) as { issues: NodeValidationIssue[] };
  return json.issues ?? [];
}
