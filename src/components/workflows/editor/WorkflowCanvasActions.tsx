"use client";

import { createContext, useContext, type ReactNode } from "react";

type WorkflowCanvasActions = {
  runNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  duplicateNodeWithEdges: (nodeId: string) => void;
  toggleLockNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  addToRequest: (targetNodeId: string, targetHandleId: string, fieldLabel?: string) => void;
  /** Merge fields into node.data.inputs (controlled canvas state). */
  patchNodeInputs: (nodeId: string, patch: Record<string, unknown>) => void;
  /** Shallow-merge fields into node.data. */
  patchNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
};

const WorkflowCanvasActionsContext = createContext<WorkflowCanvasActions | null>(null);

export function WorkflowCanvasActionsProvider({
  value,
  children,
}: {
  value: WorkflowCanvasActions;
  children: ReactNode;
}) {
  return (
    <WorkflowCanvasActionsContext.Provider value={value}>
      {children}
    </WorkflowCanvasActionsContext.Provider>
  );
}

export function useWorkflowCanvasActions(): WorkflowCanvasActions | null {
  return useContext(WorkflowCanvasActionsContext);
}
