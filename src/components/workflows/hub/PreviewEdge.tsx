import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { getReceiverEdgeStroke } from "@/lib/editor/edgeStyles";

function PreviewEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<{ targetType?: string; targetHandle?: string | null }>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = getReceiverEdgeStroke(data?.targetType, data?.targetHandle);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke,
        strokeWidth: 2,
        strokeLinecap: "round",
        opacity: 0.8,
        pointerEvents: "none",
      }}
    />
  );
}

export const PreviewEdge = memo(PreviewEdgeComponent);
