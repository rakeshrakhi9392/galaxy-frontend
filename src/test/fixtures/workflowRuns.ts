import type { NodeRun, WorkflowRun } from "@/lib/types";

export function makeWorkflowRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: "run-1",
    workflowId: "wf-1",
    scope: "FULL",
    status: "SUCCESS",
    initiator: "UI",
    targetNodeIds: [],
    triggerRunId: "trigger-1",
    estimatedCredits: 10,
    actualCredits: 10,
    startedAt: "2026-07-01T10:00:00.000Z",
    finishedAt: "2026-07-01T10:00:02.500Z",
    errorSummary: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:02.500Z",
    ...overrides,
  };
}

export function makeNodeRun(overrides: Partial<NodeRun> = {}): NodeRun {
  return {
    id: "nr-1",
    workflowRunId: "run-1",
    nodeId: "node-a",
    nodeType: "llm",
    attempt: 1,
    status: "SUCCESS",
    startedAt: "2026-07-01T10:00:00.100Z",
    finishedAt: "2026-07-01T10:00:01.500Z",
    resolvedInput: null,
    resolvedOutput: null,
    input: { prompt: "hello" },
    output: { text: "world" },
    provider: "openai",
    error: null,
    estimatedCredits: 5,
    actualCredits: 5,
    createdAt: "2026-07-01T10:00:00.100Z",
    updatedAt: "2026-07-01T10:00:01.500Z",
    ...overrides,
  };
}
