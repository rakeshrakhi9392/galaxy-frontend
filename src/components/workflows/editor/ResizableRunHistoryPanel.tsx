"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node } from "reactflow";
import {
  HISTORY_PANEL_DEFAULT_WIDTH,
  HISTORY_PANEL_MIN_WIDTH,
} from "@/lib/editor/constants";
import type { ExecutionAction, ExecutionState } from "@/lib/runHistory/executionState";
import { RunHistory } from "./RunHistory";

const HISTORY_PANEL_MAX_VW_FRACTION = 0.6;

export function ResizableRunHistoryPanel({
  workflowId,
  width,
  onWidthChange,
  onClose,
  execution,
  dispatch,
  runCompletedTick,
  onFocusNode,
  editorNodes = [],
}: {
  workflowId: string;
  width: number;
  onWidthChange: (w: number) => void;
  onClose: () => void;
  execution: ExecutionState;
  dispatch: (action: ExecutionAction) => void;
  runCompletedTick: number;
  onFocusNode?: (nodeId: string) => void;
  editorNodes?: Node[];
}) {
  const [localWidth, setLocalWidth] = useState(width || HISTORY_PANEL_DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(localWidth);

  useEffect(() => {
    setLocalWidth(width);
  }, [width]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = localWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [localWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const maxWidth = Math.floor(window.innerWidth * HISTORY_PANEL_MAX_VW_FRACTION);
      const delta = startX.current - e.clientX;
      const next = Math.min(
        maxWidth,
        Math.max(HISTORY_PANEL_MIN_WIDTH, startWidth.current + delta),
      );
      setLocalWidth(next);
      onWidthChange(next);
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onWidthChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-y-0 right-0 z-50 flex h-full min-h-0 shrink-0 overflow-hidden border-l border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900"
      style={{ width: localWidth }}
      role="dialog"
      aria-modal="true"
      aria-label="Execution history"
    >
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-zinc-300 active:bg-zinc-400"
        aria-label="Resize execution history panel"
        role="separator"
        aria-orientation="vertical"
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RunHistory
          workflowId={workflowId}
          execution={execution}
          dispatch={dispatch}
          onClose={onClose}
          runCompletedTick={runCompletedTick}
          onFocusNode={onFocusNode}
          editorNodes={editorNodes}
        />
      </div>
    </div>
  );
}
