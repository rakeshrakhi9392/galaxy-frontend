import type { Connection, Edge, Node } from "reactflow";
import type { WorkflowNode } from "@galaxy/schemas";
import {
  areHandleTypesCompatible,
  buildHandleRegistryFromUi,
  isSingleIncomingHandle,
  resolveConnectionSourceDataType,
  resolveConnectionTargetDataType,
  isValidConnectionSourceHandle,
  isValidConnectionTargetHandle,
} from "@galaxy/schemas";
import { nodeDefinitions } from "@/generated/nodeRegistry";
import { hasCycle } from "./graphUtils";

const handleRegistry = buildHandleRegistryFromUi(
  nodeDefinitions.map((def) => ({ type: def.type, handles: def.ui.handles })),
);

function asWorkflowNode(node: Node): WorkflowNode {
  return node as WorkflowNode;
}

export function isValidWorkflowConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[],
): { valid: boolean; message?: string } {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target) return { valid: false };
  if (source === target) return { valid: false, message: "Cannot connect a node to itself." };

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return { valid: false };

  if (targetNode.type === "request") {
    return { valid: false, message: "Cannot connect into a request node." };
  }
  if (sourceNode.type === "response") {
    return { valid: false, message: "Cannot connect out of a response node." };
  }

  if (!isValidConnectionSourceHandle(asWorkflowNode(sourceNode), sourceHandle, handleRegistry)) {
    return { valid: false, message: "Invalid source handle." };
  }
  if (!isValidConnectionTargetHandle(asWorkflowNode(targetNode), targetHandle, handleRegistry)) {
    return { valid: false, message: "Invalid target handle." };
  }

  const sourceType = resolveConnectionSourceDataType(
    asWorkflowNode(sourceNode),
    sourceHandle,
    handleRegistry,
  );
  const targetType = resolveConnectionTargetDataType(
    asWorkflowNode(targetNode),
    targetHandle,
    handleRegistry,
  );
  if (!areHandleTypesCompatible(sourceType, targetType)) {
    return {
      valid: false,
      message: `Incompatible connection: ${sourceType} cannot connect to ${targetType}.`,
    };
  }

  const normalizedTargetHandle =
    targetHandle ?? (targetNode.type === "response" ? "result" : "");
  const duplicate = edges.some(
    (e) =>
      e.target === target &&
      (e.targetHandle ?? (targetNode.type === "response" ? "result" : "")) ===
        normalizedTargetHandle,
  );
  if (
    duplicate &&
    targetNode.type !== "response" &&
    isSingleIncomingHandle(normalizedTargetHandle, targetType)
  ) {
    return { valid: false, message: "That input already has a connection." };
  }

  const candidate: Edge = {
    id: "candidate",
    source,
    target,
    sourceHandle: sourceHandle ?? undefined,
    targetHandle: targetHandle ?? (targetNode.type === "response" ? "result" : undefined),
  };
  if (hasCycle(nodes, edges, candidate)) {
    return { valid: false, message: "Connections cannot form a cycle." };
  }

  return { valid: true };
}

export { getNodeDefinition } from "@/generated/nodeRegistry";
