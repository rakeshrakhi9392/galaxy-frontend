import type { ReactFlowInstance } from "reactflow";
import { NODE_WIDTH } from "./constants";

const DEFAULT_NEW_NODE_HEIGHT = 96;
const NEW_NODE_STAGGER = 30;
const FALLBACK_POSITION = { x: 420, y: 160 };

export type ViewportCenterOptions = {
  staggerIndex?: number;
  nodeWidth?: number;
  nodeHeight?: number;
};

/** Flow coordinates for placing a new node in the center of the visible canvas pane. */
export function getViewportCenterFlowPosition(
  rf: ReactFlowInstance | null,
  paneElement: Element | null,
  options: ViewportCenterOptions = {},
): { x: number; y: number } {
  const {
    staggerIndex = 0,
    nodeWidth = NODE_WIDTH,
    nodeHeight = DEFAULT_NEW_NODE_HEIGHT,
  } = options;

  if (!rf || !paneElement) {
    return {
      x: FALLBACK_POSITION.x + staggerIndex * NEW_NODE_STAGGER,
      y: FALLBACK_POSITION.y + staggerIndex * NEW_NODE_STAGGER,
    };
  }

  const rect = paneElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      x: FALLBACK_POSITION.x + staggerIndex * NEW_NODE_STAGGER,
      y: FALLBACK_POSITION.y + staggerIndex * NEW_NODE_STAGGER,
    };
  }

  const center = rf.screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });

  return {
    x: center.x - nodeWidth / 2 + staggerIndex * NEW_NODE_STAGGER,
    y: center.y - nodeHeight / 2 + staggerIndex * NEW_NODE_STAGGER,
  };
}
