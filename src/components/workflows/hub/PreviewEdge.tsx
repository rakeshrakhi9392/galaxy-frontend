import { memo, useCallback } from "react";
import { BaseEdge, getBezierPath, useStore, type EdgeProps, type Node } from "reactflow";
import { getSourceEdgeStroke } from "@/lib/editor/edgeStyles";

function PreviewEdgeComponent({
  id,
  source,
  sourceHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const sourceNode = useStore(
    useCallback(
      (state) => state.nodeInternals.get(source) as Node | undefined,
      [source],
    ),
  );

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = getSourceEdgeStroke(sourceNode, sourceHandleId);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke,
        strokeWidth: 2,
        strokeDasharray: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: 0.8,
        pointerEvents: "none",
      }}
    />
  );
}

export const PreviewEdge = memo(PreviewEdgeComponent);
