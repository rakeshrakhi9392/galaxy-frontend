"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type Viewport,
} from "reactflow";
import { ReactFlowProvider } from "reactflow";
import {
  DEFAULT_VIEWPORT,
  DOT_COLOR,
  DOT_GAP,
  MAX_ZOOM,
  MIN_ZOOM,
  PREVIEW_MINIMAP_BACKGROUND_COLOR,
  PREVIEW_MINIMAP_HEIGHT,
  PREVIEW_MINIMAP_MASK_COLOR,
  PREVIEW_MINIMAP_NODE_COLOR,
  PREVIEW_MINIMAP_WIDTH,
} from "@/lib/editor/constants";
import { workflowNodeTypes } from "@/components/workflows/editor/nodeTypes";
import { PreviewEdge } from "./PreviewEdge";

const edgeTypes = { preview: PreviewEdge };

function parseWorkflowGraph(graph: unknown): {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
} {
  const g = graph as { nodes?: Node[]; edges?: Edge[]; viewport?: Viewport };
  return {
    nodes: Array.isArray(g?.nodes) ? g.nodes : [],
    edges: Array.isArray(g?.edges) ? g.edges : [],
    viewport: g?.viewport,
  };
}

function WorkflowStructurePreviewCanvas({ graph }: { graph: unknown }) {
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const didInitialViewRef = useRef(false);
  const initialGraph = useMemo(() => parseWorkflowGraph(graph), [graph]);

  const nodes = useMemo(
    () =>
      initialGraph.nodes.map((node) => ({
        ...node,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
      })),
    [initialGraph.nodes],
  );

  const edges = useMemo(
    () =>
      initialGraph.edges.map((edge) => ({
        ...edge,
        type: "preview",
        animated: false,
        selectable: false,
        focusable: false,
        data: {
          targetType: initialGraph.nodes.find((node) => node.id === edge.target)?.type,
          targetHandle: edge.targetHandle,
        },
      })),
    [initialGraph.edges, initialGraph.nodes],
  );

  useEffect(() => {
    didInitialViewRef.current = false;
  }, [graph]);

  useEffect(() => {
    if (didInitialViewRef.current) return;

    const frame = requestAnimationFrame(() => {
      const instance = rfRef.current;
      if (!instance) return;

      didInitialViewRef.current = true;

      if (initialGraph.viewport) {
        instance.setViewport(initialGraph.viewport, { duration: 0 });
        return;
      }

      instance.fitView({ padding: 0.2, duration: 0 });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialGraph.viewport, graph]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={workflowNodeTypes}
      edgeTypes={edgeTypes}
      onInit={(instance) => {
        rfRef.current = instance;
      }}
      defaultViewport={initialGraph.viewport ?? DEFAULT_VIEWPORT}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnScroll={false}
      zoomOnScroll
      panOnDrag
      zoomOnPinch
      zoomOnDoubleClick={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      className="light !h-full !w-full !bg-white dark:!bg-[#0a0a0a]"
    >
      <Background variant={BackgroundVariant.Dots} gap={DOT_GAP} size={1} color={DOT_COLOR} />
      <MiniMap
        className="workflow-structure-minimap !border !border-zinc-700 !bg-black !shadow-sm"
        position="bottom-right"
        pannable
        zoomable
        style={{
          position: "absolute",
          top: "auto",
          left: "auto",
          right: 8,
          bottom: 8,
          width: PREVIEW_MINIMAP_WIDTH,
          height: PREVIEW_MINIMAP_HEIGHT,
          borderRadius: 8,
          backgroundColor: PREVIEW_MINIMAP_BACKGROUND_COLOR,
          margin: 0,
        }}
        maskColor={PREVIEW_MINIMAP_MASK_COLOR}
        nodeColor={() => PREVIEW_MINIMAP_NODE_COLOR}
        nodeStrokeWidth={2}
      />
    </ReactFlow>
  );
}

export function WorkflowStructurePreview({ graph }: { graph: unknown }) {
  return (
    <div
      className="workflow-structure-preview relative h-full min-h-0 w-full overflow-hidden"
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <ReactFlowProvider>
        <WorkflowStructurePreviewCanvas graph={graph} />
      </ReactFlowProvider>
    </div>
  );
}
