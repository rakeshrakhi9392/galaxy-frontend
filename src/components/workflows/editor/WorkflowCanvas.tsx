"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
} from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnectStart,
  type ReactFlowInstance,
  type Viewport,
} from "reactflow";
import {
  Calculator,
  Clock,
  Map as MapIcon,
  Minimize2,
  Play,
  Plus,
  StickyNote,
  Wallet,
} from "lucide-react";
import type { NodeRun, Workflow, WorkflowRun, WorkflowRunScope } from "@/lib/types";
import { graphFromUnknown, isScaffoldNode, parseWorkflowDocument } from "@galaxy/schemas";
import { nodeDefinitions } from "@/generated/nodeRegistry";
import {
  formatNodeValidationIssues,
  validateNodesForRun,
} from "@/lib/editor/validateNodeInputs";
import { validateProviderLimitsForRun } from "@/lib/editor/validateProviderLimits";
import {
  AUTOSAVE_DEBOUNCE_MS,
  CANVAS_MINIMAP_BACKGROUND_COLOR,
  CANVAS_MINIMAP_HEIGHT,
  CANVAS_MINIMAP_MASK_COLOR,
  CANVAS_MINIMAP_WIDTH,
  CHROME_EDGE,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM,
  DOT_COLOR,
  DOT_GAP,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_ACCENT_COLORS,
} from "@/lib/editor/constants";
import { autoArrangeNodes } from "@/lib/editor/autoArrangeNodes";
import {
  duplicateNodes,
  duplicateSingleNode,
  pasteClipboard,
  type ClipboardPayload,
} from "@/lib/editor/clipboard";
import { computeAddToRequest } from "@/lib/editor/addToRequest";
import { isValidWorkflowConnection } from "@/lib/editor/connectionValidation";
import {
  createEdgeId,
  createFieldId,
  createNodeId,
  ensureNodeInteractionDefaults,
  getSelectedNodeIds,
  graphContainsCycle,
  stripEphemeralNodeState,
  stripExecutionOutputs,
  stripExecutionOutputsFromNodeData,
  workflowToGraph,
} from "@/lib/editor/graphUtils";
import { getViewportCenterFlowPosition } from "@/lib/editor/viewportUtils";
import {
  extractResponseResults,
} from "@/lib/editor/responseResults";
import {
  formatChromeCreditParts,
} from "@/lib/editor/estimateNodeCredits";
import { readBackendErrorMessage } from "@/lib/backend";
import { AuthRequiredError, useClientApi } from "@/lib/useClientApi";
import { useCreditBalance } from "@/lib/useCreditBalance";
import { useCreditTransactions } from "@/lib/useCreditTransactions";
import { useWorkflowCreditEstimate } from "@/lib/useWorkflowCreditEstimate";
import { useWorkflowRunRealtime } from "@/lib/useWorkflowRunRealtime";
import { useWorkflowHistory } from "./hooks/useWorkflowHistory";
import { workflowNodeTypes } from "./nodeTypes";
import { ToolbarTooltip } from "./ToolbarTooltip";
import { CustomEdge } from "./CustomEdge";
import { CanvasWorkflowNav } from "./CanvasWorkflowNav";
import { CanvasToolbar } from "./CanvasToolbar";
import { NodePicker } from "./NodePicker";
import { WorkflowCanvasActionsProvider } from "./WorkflowCanvasActions";
import { ExecutionOutputsProvider } from "./ExecutionOutputsContext";
import { closeAllComboboxes, useIsCanvasZoomLocked } from "./canvasZoomLock";
import { CanvasMessageToast } from "./CanvasMessageToast";
import { ConnectionDragTooltip } from "./ConnectionDragTooltip";
import { GraphCycleWarning } from "./GraphCycleWarning";
import { SaveToast, type SaveToastState } from "./SaveToast";
import { CreditTransactionLog } from "./CreditTransactionLog";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { parseFailedNodeIdFromSummary } from "@/lib/runHistory/runHistoryDisplay";

const edgeTypes = { custom: CustomEdge };

type ExecutionState = {
  currentRunId: string | null;
  history: WorkflowRun[];
  nodeRuns: NodeRun[];
  nodeStatuses: Record<string, "IDLE" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED">;
};

type ExecutionAction =
  | { type: "history_set"; history: WorkflowRun[] }
  | { type: "run_created"; run: WorkflowRun }
  | { type: "run_updated"; run: WorkflowRun }
  | { type: "node_runs_received"; runId: string; nodeRuns: NodeRun[] }
  | { type: "node_status"; nodeId: string; status: ExecutionState["nodeStatuses"][string] }
  | { type: "clear_node_statuses" };

type RunStatus = "idle" | "starting" | "running" | "done" | "error";

function useDebouncedCallback<T extends (...args: never[]) => void>(cb: T, delayMs: number) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);
  const timerRef = useRef<number | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => cbRef.current(...args), delayMs);
    },
    [delayMs],
  );
}

/** Ephemeral client-only field: purple pulse while RUNNING, red while FAILED (in-flight only). */
function applyNodeStatuses(nodes: Node[], statuses: ExecutionState["nodeStatuses"]): Node[] {
  return nodes.map((n) => {
    const st = statuses[n.id];
    const nextLive: "RUNNING" | "FAILED" | undefined =
      st === "RUNNING" ? "RUNNING" : st === "FAILED" ? "FAILED" : undefined;
    const prev = (n.data as { liveExecutionStatus?: "RUNNING" | "FAILED" }).liveExecutionStatus;

    if (nextLive === prev) return n;
    if (nextLive == null && prev == null) return n;

    const data = { ...n.data } as Record<string, unknown>;
    if (nextLive != null) {
      data.liveExecutionStatus = nextLive;
    } else {
      delete data.liveExecutionStatus;
    }

    return {
      ...n,
      data,
    };
  });
}

function stripLiveExecutionStatus(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    const data = n.data as { liveExecutionStatus?: "RUNNING" | "FAILED" };
    if (data.liveExecutionStatus == null) return n;
    const nextData = { ...n.data } as Record<string, unknown>;
    delete nextData.liveExecutionStatus;
    return { ...n, data: nextData };
  });
}

function hydrateOutputsFromNodeRuns(nodes: Node[], nodeRuns: NodeRun[]): Node[] {
  const byNodeId = new Map(nodeRuns.map((nr) => [nr.nodeId, nr]));
  return nodes.map((n) => {
    const nr = byNodeId.get(n.id);
    if (!nr || nr.status !== "SUCCESS") return n;
    if (n.type === "response") {
      const results = extractResponseResults(nr.output);
      if (results == null) return n;
      return {
        ...n,
        data: {
          ...n.data,
          results,
        },
      };
    }
    if (!nr.output) return n;
    if (n.type === "llm" && typeof nr.output === "object" && nr.output && "output" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: (nr.output as { output: string }).output } };
    }
    if (n.type === "gpt-image-2" && typeof nr.output === "object" && nr.output && "result" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: nr.output as { result: Array<{ url: string }> } } };
    }
    if (n.type === "kling-v3-pro" && typeof nr.output === "object" && nr.output && "result" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: nr.output as { result: { url: string } } } };
    }
    if (n.type === "merge-video" && typeof nr.output === "object" && nr.output && "video_url" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: nr.output as { video_url: string } } };
    }
    if (n.type === "merge-av" && typeof nr.output === "object" && nr.output && "video_url" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: nr.output as { video_url: string } } };
    }
    if (n.type === "extract-audio" && typeof nr.output === "object" && nr.output && "audio_url" in (nr.output as object)) {
      return { ...n, data: { ...n.data, lastOutput: nr.output as { audio_url: string } } };
    }
    return n;
  });
}

export function WorkflowCanvas({
  workflow,
  execution,
  dispatch,
  runCompletedTick,
  onRunCompleted,
  historyPanelOpen,
  historyPanelWidth,
  onHistoryPanelOpen,
  canvasLocked,
  focusNodeRequest,
  onRequestFocusNode,
  onEditorNodesChange,
}: {
  workflow: Workflow;
  execution: ExecutionState;
  dispatch: Dispatch<ExecutionAction>;
  runCompletedTick: number;
  onRunCompleted: () => void;
  historyPanelOpen: boolean;
  historyPanelWidth: number;
  onHistoryPanelOpen: (open: boolean) => void;
  canvasLocked: boolean;
  focusNodeRequest?: { nodeId: string; tick: number } | null;
  onRequestFocusNode?: (nodeId: string) => void;
  onEditorNodesChange?: (nodes: Node[]) => void;
}) {
  const { clientFetch, clientRequestWithRetry } = useClientApi();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [saveToast, setSaveToast] = useState<{ state: SaveToastState; text: string }>({ state: "idle", text: "" });
  const [ioError, setIoError] = useState<string | null>(null);
  const [connectionBlockedMessage, setConnectionBlockedMessage] = useState<string | null>(null);
  const [connectionTooltip, setConnectionTooltip] = useState<{
    x: number;
    y: number;
    message: string;
  } | null>(null);
  const [zoomPct, setZoomPct] = useState(Math.round(DEFAULT_ZOOM * 100));
  const [toolbarCollapsed, setToolbarCollapsed] = useState(true);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<"pan" | "select">("pan");
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [spacePanning, setSpacePanning] = useState(false);
  const [workflowName] = useState(workflow.name);
  const zoomLocked = useIsCanvasZoomLocked();

  const rfRef = useRef<ReactFlowInstance | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const isInitialized = useRef(false);
  const nodeDraggingRef = useRef(false);
  const runInProgressRef = useRef(false);
  const clipboardRef = useRef<ClipboardPayload | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const connectingRef = useRef(false);
  const connectionMouseMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const saveChainRef = useRef(Promise.resolve());

  const { init: historyInit, record: historyRecord, undo, redo, canUndo, canRedo } = useWorkflowHistory();

  nodesRef.current = nodes;
  edgesRef.current = edges;
  runInProgressRef.current = runStatus === "starting" || runStatus === "running";

  useEffect(() => {
    onEditorNodesChange?.(nodes);
  }, [nodes, onEditorNodesChange]);

  const historyPanelInset = historyPanelOpen ? historyPanelWidth : 0;
  const hasGraphCycle = useMemo(
    () => graphContainsCycle(nodes, edges),
    [nodes, edges],
  );
  const minimapRight = historyPanelInset + CHROME_EDGE;

  const selectedTargetNodeIds = useMemo(() => getSelectedNodeIds(nodes), [nodes]);
  const { totalMicrocredits: estimatedRunCredits } = useWorkflowCreditEstimate({
    nodes,
    edges,
    targetNodeIds: selectedTargetNodeIds,
  });

  const creditEstimateParts = useMemo(
    () => formatChromeCreditParts(estimatedRunCredits ?? 0),
    [estimatedRunCredits],
  );

  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [creditLogOpen, setCreditLogOpen] = useState(false);
  const { creditBalance } = useCreditBalance({ refreshKey: balanceRefreshKey });
  const {
    transactions: creditTransactions,
    loading: creditTransactionsLoading,
    error: creditTransactionsError,
    refresh: refreshCreditTransactions,
  } = useCreditTransactions({
    refreshKey: balanceRefreshKey,
    enabled: creditLogOpen,
  });
  const creditBalanceParts = useMemo(
    () => formatChromeCreditParts(creditBalance ?? 0),
    [creditBalance],
  );

  const workflowVersionRef = useRef(workflow.version ?? 1);

  useEffect(() => {
    workflowVersionRef.current = workflow.version ?? 1;
  }, [workflow.id, workflow.version]);

  const initialGraph = useMemo(() => {
    const raw = workflowToGraph(workflow);
    const normalized = graphFromUnknown({
      nodes: raw.nodes,
      edges: raw.edges.map(({ id, source, target, sourceHandle, targetHandle, type }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: type ?? "default",
      })),
      viewport: raw.viewport,
    });
    return {
      nodes: normalized.nodes as Node[],
      edges: normalized.edges as Edge[],
      viewport: normalized.viewport ?? raw.viewport,
    };
  }, [workflow]);

  useEffect(() => {
    const ns = applyNodeStatuses(
      stripExecutionOutputs(ensureNodeInteractionDefaults(initialGraph.nodes)),
      execution.nodeStatuses,
    );
    setNodes(ns);
    setEdges(
      initialGraph.edges.map((e) => ({
        ...e,
        type: "custom",
        animated: true,
        data: { targetType: ns.find((n) => n.id === e.target)?.type, targetHandle: e.targetHandle },
      })),
    );
    historyInit(initialGraph.nodes, initialGraph.edges);
    isInitialized.current = true;

    requestAnimationFrame(() => {
      rfRef.current?.setViewport(initialGraph.viewport ?? DEFAULT_VIEWPORT, { duration: 0 });
      if (!initialGraph.viewport) {
        rfRef.current?.fitView({ padding: 0.2, maxZoom: DEFAULT_ZOOM, minZoom: DEFAULT_ZOOM, duration: 180 });
      }
      setZoomPct(Math.round((rfRef.current?.getViewport().zoom ?? DEFAULT_ZOOM) * 100));
    });
  }, [workflow.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNodes((ns) => {
      const hydrated = execution.nodeRuns.length
        ? hydrateOutputsFromNodeRuns(ns, execution.nodeRuns)
        : ns;
      return applyNodeStatuses(hydrated, execution.nodeStatuses);
    });
  }, [execution.nodeRuns, execution.nodeStatuses]);

  const saveGraph = useCallback(
    async (graph: { nodes: Node[]; edges: Edge[] }, viewport?: Viewport): Promise<boolean> => {
      setSaveToast({ state: "saving", text: "Saving…" });
      try {
        const normalized = graphFromUnknown({
          nodes: stripEphemeralNodeState(graph.nodes),
          edges: graph.edges.map(({ id, source, target, sourceHandle, targetHandle, type }) => ({
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
            type: type ?? "default",
          })),
          viewport: viewport ?? rfRef.current?.getViewport(),
        });

        const res = await clientRequestWithRetry(`/api/v1/workflows/${workflow.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nodes: normalized.nodes,
            edges: normalized.edges,
            viewport: normalized.viewport ?? viewport ?? rfRef.current?.getViewport(),
            expectedVersion: workflowVersionRef.current,
          }),
        });
        if (res.status === 409) {
          const errJson = (await res.json().catch(() => null)) as {
            error?: { code?: string; message?: string };
          } | null;
          if (errJson?.error?.code === "VERSION_CONFLICT") {
            setSaveToast({
              state: "conflict",
              text: "Workflow changed in another tab — reload to continue",
            });
            return false;
          }
        }
        if (!res.ok) {
          throw new Error(await readBackendErrorMessage(res, `Save failed (${res.status})`));
        }
        const saved = (await res.json()) as { version?: number };
        if (saved.version) workflowVersionRef.current = saved.version;
        setSaveToast({ state: "saved", text: "Saved" });
        window.setTimeout(() => setSaveToast({ state: "idle", text: "" }), 900);
        return true;
      } catch (err) {
        const msg =
          err instanceof AuthRequiredError
            ? "Sign in required to save"
            : err instanceof Error
              ? err.message
              : "Save failed";
        setSaveToast({ state: "error", text: "Save failed" });
        window.setTimeout(() => setSaveToast({ state: "idle", text: "" }), 1400);
        console.error("Workflow save failed:", msg);
        return false;
      }
    },
    [workflow.id, clientRequestWithRetry],
  );

  const reloadWorkflowFromServer = useCallback(async () => {
    try {
      const res = await clientFetch(`/api/v1/workflows/${workflow.id}`);
      if (!res.ok) throw new Error("Reload failed");
      const doc = parseWorkflowDocument(await res.json());
      workflowVersionRef.current = doc.version ?? 1;
      const graph = workflowToGraph(doc);
      const ns = applyNodeStatuses(
        stripExecutionOutputs(ensureNodeInteractionDefaults(graph.nodes)),
        execution.nodeStatuses,
      );
      setNodes(ns);
      setEdges(
        graph.edges.map((e) => ({
          ...e,
          type: "custom",
          animated: true,
          data: { targetType: ns.find((n) => n.id === e.target)?.type, targetHandle: e.targetHandle },
        })),
      );
      historyInit(graph.nodes, graph.edges);
      requestAnimationFrame(() => {
        rfRef.current?.setViewport(graph.viewport ?? DEFAULT_VIEWPORT, { duration: 0 });
        setZoomPct(Math.round((rfRef.current?.getViewport().zoom ?? DEFAULT_ZOOM) * 100));
      });
      setSaveToast({ state: "idle", text: "" });
    } catch (err) {
      console.error("Workflow reload failed:", err);
      setSaveToast({ state: "error", text: "Reload failed" });
      window.setTimeout(() => setSaveToast({ state: "idle", text: "" }), 1400);
    }
  }, [workflow.id, clientFetch, execution.nodeStatuses, historyInit]);

  const debouncedSave = useDebouncedCallback(() => {
    if (!isInitialized.current || nodeDraggingRef.current || runInProgressRef.current) return;
    saveChainRef.current = saveChainRef.current.then(() =>
      saveGraph({ nodes: nodesRef.current, edges: edgesRef.current }).then(() => undefined),
    );
  }, AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!isInitialized.current) return;
    debouncedSave();
  }, [nodes, edges, debouncedSave]);

  const recordGraphChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      historyRecord(nextNodes, nextEdges);
    },
    [historyRecord],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.shiftKey) return;
    setNodes((ns) => {
      const selectedCount = ns.filter((item) => item.selected).length;
      const isOnlySelected = selectedCount === 1 && ns.some((item) => item.id === node.id && item.selected);
      if (isOnlySelected) return ns;
      return ns.map((item) => ({ ...item, selected: item.id === node.id }));
    });
  }, []);

  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    setNodes((ns) => {
      const dragged = ns.find((item) => item.id === node.id);
      if (!dragged) return ns;
      if (dragged.selected && ns.filter((item) => item.selected).length > 1) {
        return ns;
      }
      return ns.map((item) => ({ ...item, selected: item.id === node.id }));
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const allowedChanges = changes.filter((change) => {
        if (change.type !== "remove") return true;
        const node = nodesRef.current.find((item) => item.id === change.id);
        return node ? !isScaffoldNode(node) : true;
      });
      if (allowedChanges.length === 0) return;

      for (const change of allowedChanges) {
        if (change.type === "position" && change.dragging) {
          nodeDraggingRef.current = true;
        }
        if (change.type === "position" && change.dragging === false) {
          nodeDraggingRef.current = false;
        }
      }

      setNodes((ns) => {
        const next = applyNodeChanges(allowedChanges, ns);
        const shouldRecord = allowedChanges.some(
          (c) =>
            c.type === "remove" ||
            (c.type === "position" && c.dragging === false) ||
            c.type === "add",
        );
        if (shouldRecord && isInitialized.current) {
          queueMicrotask(() => recordGraphChange(next, edgesRef.current));
        }
        return next;
      });
    },
    [recordGraphChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((es) => {
        const next = applyEdgeChanges(changes, es);
        if (changes.some((c) => c.type === "remove" || c.type === "add") && isInitialized.current) {
          queueMicrotask(() => recordGraphChange(nodesRef.current, next));
        }
        return next;
      });
    },
    [recordGraphChange],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const result = isValidWorkflowConnection(connection, nodesRef.current, edgesRef.current);
      if (!result.valid && result.message) {
        setConnectionTooltip((prev) => ({
          x: prev?.x ?? 0,
          y: prev?.y ?? 0,
          message: result.message!,
        }));
      } else if (result.valid) {
        setConnectionTooltip(null);
      }
      return result.valid;
    },
    [],
  );

  const onConnectStart = useCallback<OnConnectStart>(() => {
    connectingRef.current = true;
    const onMove = (event: MouseEvent) => {
      if (!connectingRef.current) return;
      setConnectionTooltip((prev) =>
        prev?.message ? { x: event.clientX, y: event.clientY, message: prev.message } : null,
      );
    };
    connectionMouseMoveRef.current = onMove;
    window.addEventListener("mousemove", onMove);
  }, []);

  const onConnectEnd = useCallback(() => {
    connectingRef.current = false;
    const onMove = connectionMouseMoveRef.current;
    if (onMove) window.removeEventListener("mousemove", onMove);
    connectionMouseMoveRef.current = null;
    setConnectionTooltip(null);
  }, []);

  useEffect(() => {
    return () => {
      const onMove = connectionMouseMoveRef.current;
      if (onMove) window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
      const targetNode = nodesRef.current.find((n) => n.id === connection.target);
      const sourceHandle =
        sourceNode?.type === "llm" &&
        (!connection.sourceHandle ||
          connection.sourceHandle === "out" ||
          connection.sourceHandle === "out:result")
          ? "out:output"
          : connection.sourceHandle;
      const targetHandle =
        targetNode?.type === "response" && !connection.targetHandle ? "result" : connection.targetHandle;
      const edge: Edge = {
        id: createEdgeId(connection.source!, connection.target!, sourceHandle),
        source: connection.source!,
        target: connection.target!,
        sourceHandle,
        targetHandle,
        type: "custom",
        animated: true,
        data: { targetType: targetNode?.type, targetHandle },
      };
      setEdges((eds) => {
        const next = addEdge(edge, eds);
        recordGraphChange(nodesRef.current, next);
        return next;
      });
      if (targetNode?.type === "response") {
        setNodes((ns) =>
          ns.map((node) => {
            if (node.id !== connection.target) return node;
            return {
              ...node,
              data: stripExecutionOutputsFromNodeData((node.data ?? {}) as Record<string, unknown>),
            };
          }),
        );
      }
    },
    [recordGraphChange],
  );

  const addNodeOfType = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const def = nodeDefinitions.find((d) => d.type === type);
      if (!def) return;
      const id = createNodeId();
      const staggerIndex = nodesRef.current.length % 6;
      const defaults = { ...(def.ui.defaults ?? {}) };
      if (type === "request") {
        const fields = (defaults as { dynamicFields?: unknown[] }).dynamicFields;
        const fieldId = createFieldId();
        if (!Array.isArray(fields) || fields.length === 0) {
          (defaults as { dynamicFields: unknown[] }).dynamicFields = [
            { id: fieldId, name: "Input", type: "text", value: "" },
          ];
        } else {
          // Fresh field ids so multiple request nodes never share handle ids.
          (defaults as { dynamicFields: unknown[] }).dynamicFields = fields.map((field, index) => {
            const record =
              field && typeof field === "object" ? (field as Record<string, unknown>) : {};
            return {
              ...record,
              id: index === 0 ? fieldId : createFieldId(),
              name: typeof record.name === "string" ? record.name : "Input",
              type: typeof record.type === "string" ? record.type : "text",
              value: typeof record.value === "string" ? record.value : "",
            };
          });
        }
      }
      const resolvedPosition =
        position ??
        getViewportCenterFlowPosition(
          rfRef.current,
          canvasContainerRef.current?.querySelector(".react-flow") ?? null,
          { staggerIndex },
        );
      const newNode: Node = ensureNodeInteractionDefaults([
        {
          id,
          type,
          position: resolvedPosition,
          selected: true,
          data: { label: def.ui.title, ...defaults },
        },
      ])[0]!;
      setNodes((ns) => {
        const next = [
          ...ns.map((node) => ({ ...node, selected: false })),
          newNode,
        ];
        recordGraphChange(next, edgesRef.current);
        return next;
      });
    },
    [recordGraphChange],
  );

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/galaxy-node-type")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      const type = e.dataTransfer.getData("application/galaxy-node-type");
      if (!type) return;
      e.preventDefault();
      const inst = rfRef.current;
      if (!inst) return;
      const position = inst.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeOfType(type, position);
      setPickerOpen(false);
    },
    [addNodeOfType],
  );

  const flushSave = useCallback(async () => {
    await saveChainRef.current;
    const ok = await saveGraph({ nodes: nodesRef.current, edges: edgesRef.current });
    if (!ok) throw new Error("Save failed");
  }, [saveGraph]);

  const runWorkflow = useCallback(
    async (options?: { selectedNodeIds?: string[] }) => {
      if (nodeDraggingRef.current) {
        setIoError("Finish moving nodes before running.");
        window.setTimeout(() => setIoError(null), 3500);
        return;
      }

      if (graphContainsCycle(nodesRef.current, edgesRef.current)) {
        setIoError("Connections cannot form a cycle. Remove a cycle before running.");
        window.setTimeout(() => setIoError(null), 6000);
        return;
      }

      const inputIssues = validateNodesForRun(
        nodesRef.current,
        options?.selectedNodeIds,
        edgesRef.current,
      );
      if (inputIssues.length > 0) {
        setIoError(formatNodeValidationIssues(inputIssues));
        window.setTimeout(() => setIoError(null), 6000);
        return;
      }

      setRunStatus("starting");
      dispatch({ type: "clear_node_statuses" });
      setNodes((ns) => stripExecutionOutputs(ns));
      setIoError(null);

      try {
        const limitIssues = await validateProviderLimitsForRun(
          clientFetch,
          nodesRef.current,
          options?.selectedNodeIds,
          edgesRef.current,
        );
        if (limitIssues.length > 0) {
          dispatch({ type: "clear_node_statuses" });
          setIoError(formatNodeValidationIssues(limitIssues));
          setRunStatus("error");
          window.setTimeout(() => setIoError(null), 6000);
          return;
        }
      } catch (err) {
        dispatch({ type: "clear_node_statuses" });
        setIoError(
          err instanceof AuthRequiredError
            ? "Sign in to run workflows."
            : err instanceof Error
              ? err.message
              : "Could not verify provider input limits before running.",
        );
        setRunStatus("error");
        window.setTimeout(() => setIoError(null), 3500);
        return;
      }

      try {
        await flushSave();
      } catch {
        dispatch({ type: "clear_node_statuses" });
        setIoError("Could not save workflow before running.");
        setRunStatus("error");
        window.setTimeout(() => setIoError(null), 3500);
        return;
      }

      // Client sends selected node IDs, or nothing. Server labels scope from count
      // (0=full, 1=single, 2+=partial/SELECTION) and builds the execution closure.
      const targetNodeIds = options?.selectedNodeIds ?? [];
      const scope: WorkflowRunScope =
        targetNodeIds.length === 0
          ? "FULL"
          : targetNodeIds.length === 1
            ? "SINGLE"
            : "SELECTION";

      try {
        const graph = graphFromUnknown({
          nodes: stripEphemeralNodeState(nodesRef.current),
          edges: edgesRef.current.map(({ id, source, target, sourceHandle, targetHandle, type }) => ({
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
            type: type ?? "default",
          })),
        });

        const res = await clientFetch(`/api/v1/workflows/${workflow.id}/runs`, {
          method: "POST",
          body: JSON.stringify({
            scope,
            targetNodeIds,
            graph,
          }),
        });
        const json = (await res.json()) as { run: WorkflowRun };
        dispatch({ type: "run_created", run: json.run });
        setRunStatus("running");
        onHistoryPanelOpen(true);
      } catch (err) {
        dispatch({ type: "clear_node_statuses" });
        setIoError(err instanceof Error ? err.message : "Network error while starting run.");
        setRunStatus("error");
        window.setTimeout(() => setIoError(null), 3500);
      }
    },
    [workflow.id, dispatch, flushSave, onHistoryPanelOpen, clientFetch],
  );

  const currentWorkflowRun = execution.currentRunId
    ? execution.history.find((r) => r.id === execution.currentRunId) ?? null
    : null;

  useWorkflowRunRealtime({
    workflowRunId: execution.currentRunId,
    workflowRun: currentWorkflowRun,
    enabled: Boolean(execution.currentRunId),
    onUpdate: (payload) => {
      dispatch({ type: "run_updated", run: payload.run });
      dispatch({ type: "node_runs_received", runId: payload.run.id, nodeRuns: payload.nodeRuns });
    },
    onSnapshotError: (message) => {
      setIoError(message);
      window.setTimeout(() => setIoError(null), 6000);
    },
  });

  const handledTerminalRunIdsRef = useRef<Set<string>>(new Set());

  const focusNodeOnCanvas = useCallback((nodeId: string) => {
    const rf = rfRef.current;
    if (!rf) return;
    const node = rf.getNode(nodeId);
    if (!node) return;
    const width = node.width ?? 280;
    const height = node.height ?? 120;
    const x = node.position.x + width / 2;
    const y = node.position.y + height / 2;
    void rf.setCenter(x, y, { zoom: rf.getZoom(), duration: 280 });
    setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === nodeId })));
  }, []);

  useEffect(() => {
    if (!focusNodeRequest) return;
    focusNodeOnCanvas(focusNodeRequest.nodeId);
  }, [focusNodeRequest, focusNodeOnCanvas]);

  useEffect(() => {
    const current = execution.currentRunId
      ? execution.history.find((r) => r.id === execution.currentRunId)
      : null;
    if (!current) return;

    if (current.status === "RUNNING" || current.status === "QUEUED") {
      // Ignore stale active snapshots after this run already settled.
      if (handledTerminalRunIdsRef.current.has(current.id)) return;
      setRunStatus("running");
      return;
    }

    if (
      current.status !== "SUCCESS" &&
      current.status !== "FAILED" &&
      current.status !== "CANCELLED"
    ) {
      return;
    }
    // Terminal handling must run once per run id — history updates otherwise
    // re-fire onRunCompleted and thrash the history panel.
    if (handledTerminalRunIdsRef.current.has(current.id)) return;
    handledTerminalRunIdsRef.current.add(current.id);
    setBalanceRefreshKey((key) => key + 1);

    // Strip all live glow on settle — including red FAILED pulses after a failed run.
    dispatch({ type: "clear_node_statuses" });
    setNodes((ns) => stripLiveExecutionStatus(ns));

    setRunStatus("idle");

    if (current.status === "SUCCESS") {
      onRunCompleted();
      return;
    }

    const failedNodeId =
      parseFailedNodeIdFromSummary(current.errorSummary) ??
      execution.nodeRuns.find((nr) => nr.status === "FAILED")?.nodeId ??
      null;
    if (failedNodeId) onRequestFocusNode?.(failedNodeId);
    onRunCompleted();
  }, [execution.currentRunId, execution.history, execution.nodeRuns, dispatch, onRunCompleted, onRequestFocusNode]);

  useEffect(() => {
    if (!execution.currentRunId) return;
    (async () => {
      try {
        const res = await clientFetch(`/api/v1/runs/${execution.currentRunId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { nodeRuns: NodeRun[] };
        dispatch({ type: "node_runs_received", runId: execution.currentRunId!, nodeRuns: json.nodeRuns });
      } catch {
        // ignore
      }
    })();
  }, [execution.currentRunId, runCompletedTick, dispatch]);

  useEffect(() => {
    function onDeleteEdge(e: Event) {
      const { edgeId } = (e as CustomEvent<{ edgeId: string }>).detail;
      const removed = edgesRef.current.find((edge) => edge.id === edgeId);
      setEdges((eds) => {
        const next = eds.filter((edge) => edge.id !== edgeId);
        recordGraphChange(nodesRef.current, next);
        return next;
      });
      if (removed?.target) {
        const targetNode = nodesRef.current.find((node) => node.id === removed.target);
        if (targetNode?.type === "response") {
          setNodes((ns) =>
            ns.map((node) => {
              if (node.id !== removed.target) return node;
              return {
                ...node,
                data: stripExecutionOutputsFromNodeData((node.data ?? {}) as Record<string, unknown>),
              };
            }),
          );
        }
      }
    }
    window.addEventListener("galaxy:deleteEdge", onDeleteEdge);
    return () => window.removeEventListener("galaxy:deleteEdge", onDeleteEdge);
  }, [recordGraphChange]);

  const handleUndo = useCallback(() => {
    const snap = undo();
    if (snap) {
      setNodes(snap.nodes);
      setEdges(snap.edges);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const snap = redo();
    if (snap) {
      setNodes(snap.nodes);
      setEdges(snap.edges);
    }
  }, [redo]);

  const handleAutoArrange = useCallback(() => {
    setNodes((ns) => {
      const arranged = autoArrangeNodes(ns, edgesRef.current);
      recordGraphChange(arranged, edgesRef.current);
      requestAnimationFrame(() => rfRef.current?.fitView({ padding: 0.2, duration: 180 }));
      return arranged;
    });
  }, [recordGraphChange]);

  const handleFitView = useCallback(() => {
    rfRef.current?.fitView({ padding: 0.2, duration: 180 });
  }, []);

  const handleZoom = useCallback((delta: number) => {
    const vp = rfRef.current?.getViewport();
    if (!vp) return;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom + delta));
    rfRef.current?.setViewport({ ...vp, zoom: next }, { duration: 120 });
    setZoomPct(Math.round(next * 100));
  }, []);

  const panOnDrag = canvasMode === "pan" || spacePanning;
  const selectionOnDrag = canvasMode === "select" && !spacePanning;

  const shortcutsDisabled =
    canvasLocked || shortcutsModalOpen || pickerOpen;

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpacePanning(true);
      }
      if (shortcutsDisabled || isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFitView();
      }
      if (e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleAutoArrange();
      }
      if (e.key === "s" || e.key === "S") {
        if (!mod) {
          e.preventDefault();
          setCanvasMode((m) => (m === "pan" ? "select" : "pan"));
        }
      }
      if (e.key === "Escape") {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
        setEdges((es) => es.map((edge) => ({ ...edge, selected: false })));
        setPickerOpen(false);
      }
      if (mod && e.key === "a") {
        e.preventDefault();
        setNodes((ns) => ns.map((n) => ({ ...n, selected: true })));
      }
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (mod && e.key === "c") {
        const selected = nodesRef.current.filter((n) => n.selected);
        if (selected.length) {
          clipboardRef.current = {
            nodes: JSON.parse(JSON.stringify(selected)),
            edges: JSON.parse(
              JSON.stringify(
                edgesRef.current.filter(
                  (edge) => selected.some((n) => n.id === edge.source) && selected.some((n) => n.id === edge.target),
                ),
              ),
            ),
          };
        }
      }
      if (mod && e.key === "v") {
        e.preventDefault();
        if (!clipboardRef.current) return;
        const { nodes: pastedNodes, edges: pastedEdges } = pasteClipboard(clipboardRef.current);
        setNodes((ns) => {
          const deselected = ns.map((n) => ({ ...n, selected: false }));
          const next = [...deselected, ...pastedNodes];
          setEdges((es) => {
            const nextEdges = [...es.map((edge) => ({ ...edge, selected: false })), ...pastedEdges];
            recordGraphChange(next, nextEdges);
            return nextEdges;
          });
          return next;
        });
      }
      if (mod && e.key === "d") {
        e.preventDefault();
        const selectedIds = getSelectedNodeIds(nodesRef.current);
        if (!selectedIds.length) return;
        const withEdges = e.shiftKey;
        const { nodes: dupNodes, edges: dupEdges } = duplicateNodes(
          nodesRef.current,
          edgesRef.current,
          selectedIds,
        );
        setNodes((ns) => {
          const deselected = ns.map((n) => ({ ...n, selected: false }));
          const next = [...deselected, ...dupNodes];
          if (withEdges) {
            setEdges((es) => {
              const nextEdges = [...es, ...dupEdges];
              recordGraphChange(next, nextEdges);
              return nextEdges;
            });
          } else {
            recordGraphChange(next, edgesRef.current);
          }
          return next;
        });
      }
      if (e.key === "+" || e.key === "=") {
        if (zoomLocked) return;
        e.preventDefault();
        handleZoom(0.1);
      }
      if (e.key === "-") {
        if (zoomLocked) return;
        e.preventDefault();
        handleZoom(-0.1);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpacePanning(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    shortcutsDisabled,
    handleFitView,
    handleAutoArrange,
    handleUndo,
    handleRedo,
    handleZoom,
    recordGraphChange,
    zoomLocked,
  ]);

  const onRunClick = useCallback(() => {
    const selected = getSelectedNodeIds(nodesRef.current);
    runWorkflow(selected.length ? { selectedNodeIds: selected } : undefined);
  }, [runWorkflow]);

  const applyNodeGraphUpdate = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      recordGraphChange(nextNodes, nextEdges);
    },
    [recordGraphChange],
  );

  const patchNodeInputs = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((ns) => {
        const next = ns.map((node) => {
          if (node.id !== nodeId) return node;
          const data = (node.data ?? {}) as Record<string, unknown>;
          const inputs =
            data.inputs && typeof data.inputs === "object" && !Array.isArray(data.inputs)
              ? (data.inputs as Record<string, unknown>)
              : {};
          return {
            ...node,
            data: {
              ...data,
              inputs: { ...inputs, ...patch },
            },
          };
        });
        if (isInitialized.current) {
          queueMicrotask(() => recordGraphChange(next, edgesRef.current));
        }
        return next;
      });
    },
    [recordGraphChange],
  );

  const patchNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((ns) => {
        const next = ns.map((node) => {
          if (node.id !== nodeId) return node;
          const data = (node.data ?? {}) as Record<string, unknown>;
          return {
            ...node,
            data: {
              ...data,
              ...patch,
            },
          };
        });
        if (isInitialized.current) {
          queueMicrotask(() => recordGraphChange(next, edgesRef.current));
        }
        return next;
      });
    },
    [recordGraphChange],
  );

  const canvasActions = useMemo(
    () => ({
      runNode: (nodeId: string) => {
        void runWorkflow({ selectedNodeIds: [nodeId] });
      },
      duplicateNode: (nodeId: string) => {
        const { nodes: dupNodes } = duplicateSingleNode(
          nodesRef.current,
          edgesRef.current,
          nodeId,
          false,
        );
        if (!dupNodes.length) return;
        const nextNodes = [
          ...nodesRef.current.map((node) => ({ ...node, selected: false })),
          ...dupNodes,
        ];
        applyNodeGraphUpdate(nextNodes, edgesRef.current);
      },
      duplicateNodeWithEdges: (nodeId: string) => {
        const { nodes: dupNodes, edges: dupEdges } = duplicateSingleNode(
          nodesRef.current,
          edgesRef.current,
          nodeId,
          true,
        );
        if (!dupNodes.length) return;
        const nextNodes = [
          ...nodesRef.current.map((node) => ({ ...node, selected: false })),
          ...dupNodes,
        ];
        const nextEdges = [...edgesRef.current, ...dupEdges];
        applyNodeGraphUpdate(nextNodes, nextEdges);
      },
      toggleLockNode: (nodeId: string) => {
        const nextNodes = nodesRef.current.map((node) => {
          if (node.id !== nodeId) return node;
          const isLocked = (node.data as { locked?: boolean }).locked === true;
          return {
            ...node,
            draggable: isLocked ? true : false,
            connectable: isLocked ? true : false,
            data: { ...node.data, locked: !isLocked },
          };
        });
        applyNodeGraphUpdate(nextNodes, edgesRef.current);
      },
      deleteNode: (nodeId: string) => {
        const target = nodesRef.current.find((node) => node.id === nodeId);
        if (target && isScaffoldNode(target)) return;
        const nextNodes = nodesRef.current.filter((node) => node.id !== nodeId);
        const nextEdges = edgesRef.current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        );
        applyNodeGraphUpdate(nextNodes, nextEdges);
      },
      addToRequest: (targetNodeId: string, targetHandleId: string, fieldLabel?: string) => {
        const result = computeAddToRequest({
          nodes: nodesRef.current,
          edges: edgesRef.current,
          targetNodeId,
          targetHandleId,
          fieldLabel,
          createNodeId,
          createFieldId,
          createEdgeId,
        });
        if (!result.ok) {
          setConnectionBlockedMessage(result.message);
          window.setTimeout(() => setConnectionBlockedMessage(null), 3200);
          return;
        }
        applyNodeGraphUpdate(result.nodes, result.edges);
      },
      patchNodeInputs,
      patchNodeData,
    }),
    [applyNodeGraphUpdate, patchNodeData, patchNodeInputs, runWorkflow],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <SaveToast state={saveToast.state} text={saveToast.text} onReload={reloadWorkflowFromServer} />

      <div
        ref={canvasContainerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-surface-main-background-2 dark:bg-galaxy-surface-main"
      >
        <ExecutionOutputsProvider
          currentRunId={execution.currentRunId}
          nodeRuns={execution.nodeRuns}
        >
        <WorkflowCanvasActionsProvider value={canvasActions}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={workflowNodeTypes}
            edgeTypes={edgeTypes}
            onInit={(inst) => {
              rfRef.current = inst;
            }}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onNodeDragStart={onNodeDragStart}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            isValidConnection={isValidConnection}
            defaultViewport={DEFAULT_VIEWPORT}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            panOnScroll={false}
            panOnDrag={panOnDrag}
            selectionOnDrag={selectionOnDrag}
            selectNodesOnDrag={canvasMode === "pan"}
            selectionMode={canvasMode === "select" ? SelectionMode.Partial : SelectionMode.Full}
            elementsSelectable={!canvasLocked}
            nodesDraggable={!canvasLocked}
            nodesConnectable={!canvasLocked}
            zoomOnScroll={!zoomLocked}
            zoomOnPinch={!zoomLocked}
            className="!h-full !w-full bg-surface-main-background-2 dark:bg-zinc-950"
            onMoveEnd={(_, vp) => {
              setZoomPct(Math.round(vp.zoom * 100));
              debouncedSave();
            }}
            onMoveStart={() => {
              closeAllComboboxes();
            }}
            onPaneClick={() => {
              setPickerOpen(false);
              closeAllComboboxes();
            }}
            onDragOver={onCanvasDragOver}
            onDrop={onCanvasDrop}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={DOT_GAP}
              size={1}
              color={DOT_COLOR}
              className="!bg-surface-main-background-2 dark:!bg-zinc-950 [&>pattern>circle]:fill-[#cacaca] dark:[&>pattern>circle]:fill-[#333333]"
            />

            {minimapOpen ? (
              <MiniMap
                className="workflow-minimap !bottom-14 !rounded-lg !border !border-zinc-700 !bg-zinc-900 sm:!bottom-4"
                position="bottom-right"
                pannable={false}
                zoomable={false}
                style={{
                  width: CANVAS_MINIMAP_WIDTH,
                  height: CANVAS_MINIMAP_HEIGHT,
                  margin: 0,
                  right: minimapRight,
                  backgroundColor: CANVAS_MINIMAP_BACKGROUND_COLOR,
                }}
                maskColor={CANVAS_MINIMAP_MASK_COLOR}
                nodeColor={(node) =>
                  NODE_ACCENT_COLORS[node.type ?? "default"] ?? NODE_ACCENT_COLORS.default
                }
              />
            ) : null}
          </ReactFlow>

          <div className="workflow-canvas-overlay pointer-events-none absolute inset-0 z-[55]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ right: historyPanelInset }}
            >
            <div
              className="nopan nowheel pointer-events-auto absolute left-4 top-4 z-50 sm:left-16"
              style={{ top: CHROME_EDGE }}
            >
              <CanvasWorkflowNav workflow={workflow} name={workflowName} />
            </div>

            <div
              className="nopan nowheel pointer-events-auto absolute flex max-w-[calc(100%-2*16px)] flex-wrap items-center justify-end gap-2"
              style={{ top: CHROME_EDGE, right: CHROME_EDGE }}
            >
              <span className="hidden sm:inline-flex">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200">
                  <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-gray-500 dark:text-zinc-400">Est</span>
                  <span className="tabular-nums">{creditEstimateParts.value}</span>
                  <span className="text-gray-500 dark:text-zinc-400">{creditEstimateParts.unit}</span>
                </span>
              </span>
              <span className="relative hidden sm:inline-flex">
                <ToolbarTooltip label="Credit balance & transactions" placement="bottom">
                  <button
                    type="button"
                    aria-label="Credit balance and transactions"
                    aria-expanded={creditLogOpen}
                    onClick={() => setCreditLogOpen((open) => !open)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="text-gray-500 dark:text-zinc-400">Bal</span>
                    <span className="tabular-nums">{creditBalanceParts.value}</span>
                    <span className="text-gray-500 dark:text-zinc-400">{creditBalanceParts.unit}</span>
                  </button>
                </ToolbarTooltip>
                <CreditTransactionLog
                  open={creditLogOpen}
                  onClose={() => setCreditLogOpen(false)}
                  transactions={creditTransactions}
                  loading={creditTransactionsLoading}
                  error={creditTransactionsError}
                  onRefresh={refreshCreditTransactions}
                />
              </span>
              <ToolbarTooltip label="Run Workflow" placement="bottom">
                <button
                  type="button"
                  aria-label="Run Workflow"
                  disabled={runStatus === "starting" || runStatus === "running"}
                  onClick={onRunClick}
                  className={[
                    "flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-workflow-accent-400 bg-workflow-accent-500 text-white shadow-sm transition-all hover:bg-workflow-accent-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-workflow-accent-500 dark:bg-workflow-accent-600 dark:hover:bg-workflow-accent-700",
                    runStatus === "running" ? "animate-pulse" : "",
                  ].join(" ")}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
              </ToolbarTooltip>
              {!historyPanelOpen ? (
                <ToolbarTooltip label="Execution History" placement="bottom" align="end">
                  <button
                    type="button"
                    aria-label="Execution History"
                    onClick={() => onHistoryPanelOpen(true)}
                    className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm transition-all hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                </ToolbarTooltip>
              ) : null}
            </div>

            <div
              className="nopan nowheel pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2"
              style={{
                paddingLeft: CHROME_EDGE,
                paddingRight: CHROME_EDGE,
                paddingBottom: CHROME_EDGE,
              }}
            >
              <div className="pointer-events-auto min-w-0 max-w-[min(100%,420px)] shrink">
                <CanvasToolbar
                  collapsed={toolbarCollapsed}
                  zoomPct={zoomPct}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  disabled={runStatus === "running"}
                  canvasMode={canvasMode}
                  onToggleCollapse={() => setToolbarCollapsed((c) => !c)}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onZoomIn={() => handleZoom(0.1)}
                  onZoomOut={() => handleZoom(-0.1)}
                  onFitView={handleFitView}
                  onAutoArrange={handleAutoArrange}
                  onToggleMode={() => setCanvasMode((m) => (m === "pan" ? "select" : "pan"))}
                  onOpenShortcuts={() => setShortcutsModalOpen(true)}
                />
              </div>

              <div className="pointer-events-auto shrink-0">
                <div className="flex items-center gap-0.5 overflow-visible rounded-xl border border-gray-200 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 md:gap-1 md:px-2 md:py-1.5">
                  <ToolbarTooltip label="Add sticky note">
                    <button
                      type="button"
                      aria-label="Add sticky note"
                      className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                  </ToolbarTooltip>
                  <div className="relative">
                    <NodePicker
                      open={pickerOpen}
                      onClose={() => setPickerOpen(false)}
                      onPick={addNodeOfType}
                      anchorRef={addButtonRef}
                    />
                    <button
                      ref={addButtonRef}
                      type="button"
                      aria-label="Add node"
                      title="Add node"
                      aria-expanded={pickerOpen}
                      aria-haspopup="menu"
                      onClick={() => setPickerOpen((o) => !o)}
                      className={[
                        "relative z-[70] rounded p-2 transition-colors",
                        pickerOpen
                          ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                      ].join(" ")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pointer-events-auto flex w-10 shrink-0 justify-end">
                {minimapOpen ? (
                  <div
                    className="nopan nowheel pointer-events-none relative"
                    style={{
                      width: CANVAS_MINIMAP_WIDTH,
                      height: CANVAS_MINIMAP_HEIGHT,
                    }}
                  >
                    <div className="pointer-events-auto absolute -right-2 -top-2 z-10">
                      <ToolbarTooltip label="Hide minimap">
                        <button
                          type="button"
                          aria-label="Hide minimap"
                          onClick={() => setMinimapOpen(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                        >
                          <Minimize2 className="h-4 w-4 text-gray-700" />
                        </button>
                      </ToolbarTooltip>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Show minimap"
                    aria-pressed={false}
                    onClick={() => setMinimapOpen(true)}
                    className="nopan nowheel rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <MapIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {hasGraphCycle ? <GraphCycleWarning /> : null}

            {connectionTooltip?.message ? (
              <ConnectionDragTooltip
                x={connectionTooltip.x}
                y={connectionTooltip.y}
                message={connectionTooltip.message}
              />
            ) : null}

            {connectionBlockedMessage || ioError ? (
              <div
                className="pointer-events-none absolute left-1/2 z-50 flex w-full max-w-[min(92vw,480px)] -translate-x-1/2 flex-col items-stretch gap-2 px-3"
                style={{ bottom: CHROME_EDGE + 56 }}
              >
                {connectionBlockedMessage ? (
                  <CanvasMessageToast message={connectionBlockedMessage} variant="info" />
                ) : null}
                {ioError ? <CanvasMessageToast message={ioError} variant="error" /> : null}
              </div>
            ) : null}

            {canvasLocked ? (
              <div className="pointer-events-auto absolute inset-0 cursor-default">
                <div className="sr-only">Canvas locked</div>
              </div>
            ) : null}
            </div>
          </div>
        </WorkflowCanvasActionsProvider>
        </ExecutionOutputsProvider>
      </div>

      <KeyboardShortcutsModal open={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
    </div>
  );
}
