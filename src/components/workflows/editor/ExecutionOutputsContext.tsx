"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NodeRun } from "@/lib/types";

type ExecutionOutputsContextValue = {
  currentRunId: string | null;
  nodeRuns: NodeRun[];
};

const ExecutionOutputsContext = createContext<ExecutionOutputsContextValue>({
  currentRunId: null,
  nodeRuns: [],
});

export function ExecutionOutputsProvider({
  currentRunId,
  nodeRuns,
  children,
}: ExecutionOutputsContextValue & { children: ReactNode }) {
  return (
    <ExecutionOutputsContext.Provider value={{ currentRunId, nodeRuns }}>
      {children}
    </ExecutionOutputsContext.Provider>
  );
}

export function useExecutionOutputs(): ExecutionOutputsContextValue {
  return useContext(ExecutionOutputsContext);
}
