import type { Node } from "reactflow";
import type { WorkflowNode } from "@galaxy/schemas";
import {
  buildHandleRegistryFromUi,
  resolveConnectionSourceDataType,
  type HandleDataType,
} from "@galaxy/schemas";
import { nodeDefinitions } from "@/generated/nodeRegistry";

const handleRegistry = buildHandleRegistryFromUi(
  nodeDefinitions.map((def) => ({ type: def.type, handles: def.ui.handles })),
);

/** Hex strokes aligned with HANDLE_CLASS_BY_TYPE in SchemaDrivenNodeFields. */
const HANDLE_STROKE_BY_TYPE: Record<HandleDataType, string> = {
  text: "#f59e0b",
  image: "#3b82f6",
  image_list: "#3b82f6",
  video: "#22c55e",
  video_list: "#22c55e",
  audio: "#06b6d4",
  audio_list: "#06b6d4",
  number: "#ec4899",
  boolean: "#22c55e",
  enum: "#6366f1",
  any: "#9ca3af",
};

/** Request node handles always use amber regardless of field type. */
const REQUEST_SOURCE_STROKE = HANDLE_STROKE_BY_TYPE.text;

export function getHandleDataTypeStroke(dataType: HandleDataType): string {
  return HANDLE_STROKE_BY_TYPE[dataType];
}

export function getSourceEdgeStroke(
  sourceNode: Node | undefined,
  sourceHandle: string | null | undefined,
): string {
  if (!sourceNode) return HANDLE_STROKE_BY_TYPE.any;
  if (sourceNode.type === "request") return REQUEST_SOURCE_STROKE;

  const dataType = resolveConnectionSourceDataType(
    sourceNode as WorkflowNode,
    sourceHandle,
    handleRegistry,
  );
  return getHandleDataTypeStroke(dataType);
}
