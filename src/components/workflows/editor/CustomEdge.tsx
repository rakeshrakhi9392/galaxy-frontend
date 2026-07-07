import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { X } from "lucide-react";
import { getReceiverEdgeStroke } from "@/lib/editor/edgeStyles";

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
}: EdgeProps<{ targetType?: string; targetHandle?: string | null }>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = getReceiverEdgeStroke(data?.targetType, data?.targetHandle);
  const strokeWidth = selected ? 2.5 : 2;

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#726beb" : stroke,
          strokeWidth,
          filter: selected ? "drop-shadow(0 0 8px rgba(79,70,230,0.55))" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={[
            "nodrag nopan absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition hover:border-red-400 hover:bg-red-50 hover:text-red-600",
            selected ? "opacity-100" : "opacity-0 hover:opacity-100",
          ].join(" ")}
          style={{ left: labelX, top: labelY, pointerEvents: "all" }}
          aria-label="Delete connection"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("galaxy:deleteEdge", { detail: { edgeId: id } }));
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
