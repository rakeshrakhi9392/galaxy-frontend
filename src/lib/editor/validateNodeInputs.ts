import type { Edge, Node } from "reactflow";
import {
  buildPreRunOutputsByNodeId,
  inputFieldFromHandle,
  RequestDynamicFieldsSchema,
  resolveExecutionNodeIds,
  resolveNodeInputs,
  topologicalNodeOrder,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
} from "@galaxy/schemas";
import type { NodeUiField } from "@/generated/nodeRegistry";
import { getNodeDefinition } from "@/generated/nodeRegistry";
import { validateProviderLimitsFromHintsForNode } from "./validateProviderLimits";

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

function defaultInputsForType(nodeType: string | undefined): Record<string, unknown> {
  const def = getNodeDefinition(nodeType);
  return asRecord(asRecord(def?.ui.defaults).inputs);
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

export type ValidateNodeInputsContext = {
  nodes: Node[];
  edges: Edge[];
};

/**
 * Resolve the inputs a node would receive at run time:
 * registry defaults + static node.data.inputs + wired edge values.
 */
export function resolveNodeInputsForValidation(
  node: Node,
  context?: ValidateNodeInputsContext,
): Record<string, unknown> {
  const defaults = defaultInputsForType(node.type);

  if (!context || context.nodes.length === 0) {
    return {
      ...defaults,
      ...asRecord(asRecord(node.data).inputs),
    };
  }

  const graph = toWorkflowGraph(context.nodes, context.edges);
  const outputsByNodeId = buildPreRunOutputsByNodeId(graph);
  const resolved = resolveNodeInputs({
    node: node as WorkflowNode,
    graph,
    outputsByNodeId,
  });

  return {
    ...defaults,
    ...resolved,
  };
}

export type NodeValidationIssue = {
  nodeId: string;
  nodeType: string;
  label: string;
  message: string;
};

function formatIssuePath(path: PropertyKey[]): string {
  return path.map(String).filter(Boolean).join(".");
}

function issuesFromZodError(
  node: Node,
  error: { issues: { path: PropertyKey[]; message: string }[] },
): NodeValidationIssue[] {
  const label = nodeLabel(node);
  const nodeType = node.type ?? "unknown";
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    return {
      nodeId: node.id,
      nodeType,
      label,
      message: path ? `${path}: ${issue.message}` : issue.message,
    };
  });
}

function hasConfiguredValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasConfiguredValue(item));
  return true;
}

function fieldRequiredForNode(node: Node, field: NodeUiField, resolved: Record<string, unknown>): boolean {
  if (!field.required) return false;

  const dataType = field.dataType;
  if (dataType !== "image" && dataType !== "image_list") return true;

  const mode = String(resolved.mode ?? "");

  if (node.type === "gpt-image-2" && field.key === "image") {
    return mode === "image_to_image";
  }

  if (node.type === "kling-v3-pro" && field.key === "start_image_url") {
    return mode === "image_to_video" || mode === "start_end";
  }

  return true;
}

function edgeTargetsHandle(
  edge: Edge,
  nodeId: string,
  handleId: string,
): boolean {
  if (edge.target !== nodeId) return false;
  const edgeData = asRecord(edge.data);
  const targetHandle =
    edge.targetHandle ?? (typeof edgeData.targetHandle === "string" ? edgeData.targetHandle : null);
  if (targetHandle === handleId) return true;
  return inputFieldFromHandle(targetHandle) === inputFieldFromHandle(handleId);
}

function isHandleConnectedInGraph(
  edges: Edge[] | undefined,
  nodeId: string,
  handleId: string,
): boolean {
  if (!edges?.length) return false;
  return edges.some((edge) => edgeTargetsHandle(edge, nodeId, handleId));
}

function validateRequiredUiFields(
  node: Node,
  context?: ValidateNodeInputsContext,
): NodeValidationIssue[] {
  const def = getNodeDefinition(node.type);
  if (!def) return [];

  const validationContext = context ?? { nodes: [], edges: [] };
  const resolved = resolveNodeInputsForValidation(node, validationContext);
  const label = nodeLabel(node);
  const nodeType = node.type ?? "unknown";

  return def.ui.fields.flatMap((field) => {
    if (!fieldRequiredForNode(node, field, resolved)) return [];
    if (hasConfiguredValue(resolved[field.key])) return [];
    if (field.handleId && isHandleConnectedInGraph(validationContext.edges, node.id, field.handleId)) {
      return [];
    }
    return [
      {
        nodeId: node.id,
        nodeType,
        label,
        message: `${field.label} is required for this run (missing value and no connection).`,
      },
    ];
  });
}

export function validateRequestNodeFields(node: Node): NodeValidationIssue[] {
  if (node.type !== "request") return [];

  const result = RequestDynamicFieldsSchema.safeParse(asRecord(node.data).dynamicFields);
  if (result.success) return [];
  return issuesFromZodError(node, result.error);
}

/** Validate a node's resolved inputs with the shared Zod input schema. */
export function validateNodeInputs(
  node: Node,
  context?: ValidateNodeInputsContext,
): NodeValidationIssue[] {
  const nodeType = node.type;
  if (!nodeType) return [];

  const requestIssues = validateRequestNodeFields(node);
  if (nodeType === "request") return requestIssues;

  const schema = getNodeDefinition(nodeType)?.input;
  if (!schema) return requestIssues;

  const result = schema.safeParse(resolveNodeInputsForValidation(node, context));
  if (result.success) {
    return [...requestIssues, ...validateProviderLimitsFromHintsForNode(node, context)];
  }
  return [...requestIssues, ...issuesFromZodError(node, result.error)];
}

/** Validate a node's last output (when present) with the shared Zod output schema. */
export function validateNodeOutput(node: Node): NodeValidationIssue[] {
  const nodeType = node.type;
  if (!nodeType) return [];

  const schema = getNodeDefinition(nodeType)?.output;
  if (!schema) return [];

  const lastOutput = asRecord(node.data).lastOutput;
  if (lastOutput === undefined) return [];

  const result = schema.safeParse(lastOutput);
  if (result.success) return [];
  return issuesFromZodError(node, result.error);
}

function sortNodesForValidation(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length <= 1) return nodes;
  const graph = toWorkflowGraph(nodes, edges);
  const order = topologicalNodeOrder(graph);
  const rank = new Map(order.map((node, index) => [node.id, index]));
  return [...nodes].sort(
    (left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0),
  );
}

export function validateNodesInputs(
  nodes: Node[],
  context?: ValidateNodeInputsContext,
): NodeValidationIssue[] {
  const validationContext = context ?? { nodes, edges: [] };
  const ordered = sortNodesForValidation(nodes, validationContext.edges);
  return ordered.flatMap((node) => validateNodeInputs(node, validationContext));
}

export function validateNodesOutputs(nodes: Node[]): NodeValidationIssue[] {
  return nodes.flatMap((node) => validateNodeOutput(node));
}

export function formatNodeValidationIssues(issues: NodeValidationIssue[]): string {
  if (issues.length === 0) return "";
  const byNode = new Map<string, NodeValidationIssue[]>();
  for (const issue of issues) {
    const list = byNode.get(issue.nodeId) ?? [];
    list.push(issue);
    byNode.set(issue.nodeId, list);
  }

  return [...byNode.values()]
    .map((group) => {
      const label = group[0]?.label ?? "Node";
      const details = group.map((item) => item.message).join("; ");
      return `${label}: ${details}`;
    })
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .join(" · ");
}

/**
 * Nodes that will actually execute for this run (matches backend closure rules).
 */
export function resolveRunValidationTargets(
  nodes: Node[],
  edges: Edge[],
  selectedNodeIds?: string[],
): Node[] {
  const graph = toWorkflowGraph(nodes, edges);
  const executionNodeIds = resolveExecutionNodeIds(
    graph,
    selectedNodeIds && selectedNodeIds.length > 0 ? selectedNodeIds : [],
  );
  return nodes.filter((node) => executionNodeIds.has(node.id));
}

/**
 * Validate inputs and cached outputs for nodes that will run.
 * Scoped to the same execution closure the backend uses.
 */
export function validateNodesForRun(
  nodes: Node[],
  selectedNodeIds?: string[],
  edges: Edge[] = [],
): NodeValidationIssue[] {
  const graph = toWorkflowGraph(nodes, edges);
  const executionNodeIds = resolveExecutionNodeIds(
    graph,
    selectedNodeIds && selectedNodeIds.length > 0 ? selectedNodeIds : [],
  );

  if (executionNodeIds.size === 0) {
    const label = selectedNodeIds && selectedNodeIds.length > 0 ? "Selection" : "Workflow";
    return [
      {
        nodeId: selectedNodeIds?.[0] ?? "workflow",
        nodeType: "workflow",
        label,
        message:
          selectedNodeIds && selectedNodeIds.length > 0
            ? "No nodes to execute for the given selection."
            : "No nodes to execute. Full runs start from Request Inputs and follow connections downstream.",
      },
    ];
  }

  const targets = resolveRunValidationTargets(nodes, edges, selectedNodeIds);
  const context = { nodes, edges };
  return [
    ...targets.flatMap((node) => validateRequiredUiFields(node, context)),
    ...validateNodesInputs(targets, context),
    ...validateNodesOutputs(targets),
  ];
}
