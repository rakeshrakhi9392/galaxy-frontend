"use client";

import "reactflow/dist/style.css";
import { ReactFlowProvider } from "reactflow";
import type { Workflow } from "@/lib/types";
import { WorkflowWorkspace } from "./editor/WorkflowWorkspace";

export function WorkflowEditorClient({ workflow }: { workflow: Workflow }) {
  return (
    <ReactFlowProvider>
      <WorkflowWorkspace workflow={workflow} />
    </ReactFlowProvider>
  );
}
