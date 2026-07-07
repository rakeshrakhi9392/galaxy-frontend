"use client";

import { useCallback, useReducer, useState } from "react";
import type { Node } from "reactflow";
import type { Workflow } from "@/lib/types";
import {
  createInitialExecutionState,
  executionReducer,
} from "@/lib/runHistory/executionState";
import { useEditorUI } from "./hooks/useEditorUI";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { ResizableRunHistoryPanel } from "./ResizableRunHistoryPanel";

export function WorkflowWorkspace({ workflow }: { workflow: Workflow }) {
  const [execution, dispatch] = useReducer(executionReducer, undefined, createInitialExecutionState);
  const [runCompletedTick, setRunCompletedTick] = useState(0);
  const [editorNodes, setEditorNodes] = useState<Node[]>([]);
  const [focusNodeRequest, setFocusNodeRequest] = useState<{ nodeId: string; tick: number } | null>(
    null,
  );

  const {
    historyPanelOpen,
    setHistoryPanelOpen,
    historyPanelWidth,
    setHistoryPanelWidth,
    canvasLocked,
  } = useEditorUI();

  const onRunCompleted = useCallback(() => {
    setRunCompletedTick((t) => t + 1);
  }, []);

  const requestFocusNode = useCallback((nodeId: string) => {
    setFocusNodeRequest({ nodeId, tick: Date.now() });
  }, []);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      <div
        className={[
          "min-h-0 flex-1 overflow-hidden",
          historyPanelOpen ? "relative z-[45]" : "",
        ].join(" ")}
      >
        <WorkflowCanvas
          workflow={workflow}
          execution={execution}
          dispatch={dispatch}
          runCompletedTick={runCompletedTick}
          onRunCompleted={onRunCompleted}
          historyPanelOpen={historyPanelOpen}
          historyPanelWidth={historyPanelWidth}
          onHistoryPanelOpen={setHistoryPanelOpen}
          canvasLocked={canvasLocked}
          focusNodeRequest={focusNodeRequest}
          onRequestFocusNode={requestFocusNode}
          onEditorNodesChange={setEditorNodes}
        />
      </div>

      {historyPanelOpen ? (
        <ResizableRunHistoryPanel
          workflowId={workflow.id}
          width={historyPanelWidth}
          onWidthChange={setHistoryPanelWidth}
          onClose={() => setHistoryPanelOpen(false)}
          execution={execution}
          dispatch={dispatch}
          runCompletedTick={runCompletedTick}
          onFocusNode={requestFocusNode}
          editorNodes={editorNodes}
        />
      ) : null}
    </div>
  );
}
