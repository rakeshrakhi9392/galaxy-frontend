import type { Edge, Node } from "reactflow";
import type { HandleDataType } from "@/generated/nodeRegistry";
import { getNodeDefinition, isValidWorkflowConnection } from "@/lib/editor/connectionValidation";
import { ensureNodeInteractionDefaults } from "@/lib/editor/graphUtils";

export type RequestFieldType =
  | "text"
  | "number"
  | "boolean"
  | "image"
  | "audio"
  | "video"
  | "media"
  | "file";

export type RequestDynamicField = {
  id: string;
  name: string;
  type: RequestFieldType;
  value: string;
};

export function handleDataTypeToRequestFieldType(dataType: HandleDataType): RequestFieldType {
  switch (dataType) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "image":
    case "image_list":
      return "image";
    case "video":
    case "video_list":
      return "video";
    case "audio":
    case "audio_list":
      return "audio";
    case "text":
    case "enum":
    default:
      return "text";
  }
}

export function uniqueFieldName(base: string, existingNames: Iterable<string>): string {
  const taken = new Set(existingNames);
  const trimmed = base.trim() || "Input";
  if (!taken.has(trimmed)) return trimmed;
  let index = 2;
  while (taken.has(`${trimmed} ${index}`)) index += 1;
  return `${trimmed} ${index}`;
}

function getRequestFields(node: Node): RequestDynamicField[] {
  const fields = (node.data as { dynamicFields?: RequestDynamicField[] }).dynamicFields;
  return Array.isArray(fields) ? fields : [];
}

export type AddToRequestInput = {
  nodes: Node[];
  edges: Edge[];
  targetNodeId: string;
  targetHandleId: string;
  fieldLabel?: string;
  createNodeId: () => string;
  createFieldId: () => string;
  createEdgeId: (source: string, target: string, sourceHandle?: string | null) => string;
};

export type AddToRequestResult =
  | { ok: true; nodes: Node[]; edges: Edge[] }
  | { ok: false; message: string };

export function computeAddToRequest(input: AddToRequestInput): AddToRequestResult {
  const {
    nodes,
    edges,
    targetNodeId,
    targetHandleId,
    fieldLabel,
    createNodeId,
    createFieldId,
    createEdgeId,
  } = input;

  const targetNode = nodes.find((node) => node.id === targetNodeId);
  if (!targetNode) return { ok: false, message: "Node not found." };
  if (targetNode.type === "request") {
    return { ok: false, message: "Cannot add request inputs to a request node." };
  }
  if (targetNode.type === "response") {
    return { ok: false, message: "Cannot add response outputs to request." };
  }

  const def = getNodeDefinition(targetNode.type);
  const handle = def?.ui.handles.find(
    (item) => item.kind === "input" && item.id === targetHandleId,
  );
  if (!handle) return { ok: false, message: "Invalid input handle." };

  const fieldType = handleDataTypeToRequestFieldType(handle.dataType);
  const label = fieldLabel?.trim() || handle.label;
  const defaultValue = fieldType === "boolean" ? "false" : "";
  const fieldId = createFieldId();

  let nextNodes = [...nodes];
  let requestNode = nextNodes.find((node) => node.type === "request");

  if (!requestNode) {
    const requestId = createNodeId();
    const name = uniqueFieldName(label, []);
    const newRequestNode: Node = {
      id: requestId,
      type: "request",
      position: {
        x: targetNode.position.x - 420,
        y: targetNode.position.y,
      },
      data: {
        label: "Request-Inputs",
        config: {},
        inputs: {},
        dynamicFields: [{ id: fieldId, name, type: fieldType, value: defaultValue }],
      },
    };
    nextNodes = [...nextNodes, newRequestNode];
    requestNode = newRequestNode;
  } else {
    const fields = getRequestFields(requestNode);
    const name = uniqueFieldName(label, fields.map((field) => field.name));
    const newField: RequestDynamicField = {
      id: fieldId,
      name,
      type: fieldType,
      value: defaultValue,
    };
    nextNodes = nextNodes.map((node) =>
      node.id === requestNode!.id
        ? {
            ...node,
            data: {
              ...node.data,
              dynamicFields: [...fields, newField],
            },
          }
        : node,
    );
  }

  const requestId = requestNode.id;
  const nextEdges = edges.filter(
    (edge) => !(edge.target === targetNodeId && edge.targetHandle === targetHandleId),
  );

  const connection = {
    source: requestId,
    target: targetNodeId,
    sourceHandle: fieldId,
    targetHandle: targetHandleId,
  };

  const validation = isValidWorkflowConnection(connection, nextNodes, nextEdges);
  if (!validation.valid) {
    return { ok: false, message: validation.message ?? "Cannot connect to request." };
  }

  const edge: Edge = {
    id: createEdgeId(requestId, targetNodeId, fieldId),
    source: requestId,
    target: targetNodeId,
    sourceHandle: fieldId,
    targetHandle: targetHandleId,
    type: "custom",
    animated: true,
    data: { targetType: targetNode.type, targetHandle: targetHandleId },
  };

  return {
    ok: true,
    nodes: ensureNodeInteractionDefaults(nextNodes),
    edges: [...nextEdges, edge],
  };
}
