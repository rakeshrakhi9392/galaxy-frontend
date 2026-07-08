import { describe, expect, it } from "vitest";
import {
  applyDisconnectedRunFailure,
  canUseTriggerRealtime,
  RUN_NOT_CONNECTED_MESSAGE,
} from "./workflowRunRealtimePolicy";
import type { RunWithNodes, WorkflowRun } from "./types";

function workflowRun(partial: Partial<WorkflowRun> & Pick<WorkflowRun, "id" | "status">): WorkflowRun {
  const { status, ...rest } = partial;
  return {
    workflowId: "wf-1",
    scope: "FULL",
    targetNodeIds: [],
    triggerRunId: null,
    initiator: "UI",
    status,
    estimatedCredits: null,
    actualCredits: null,
    errorSummary: null,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}

describe("workflowRunRealtimePolicy", () => {
  it("marks active runs without triggerRunId as failed", () => {
    const snapshot: RunWithNodes = {
      run: workflowRun({ id: "run-1", status: "QUEUED" }),
      nodeRuns: [],
    };

    const next = applyDisconnectedRunFailure(snapshot);
    expect(next.run.status).toBe("FAILED");
    expect(next.run.errorSummary).toBe(RUN_NOT_CONNECTED_MESSAGE);
  });

  it("preserves terminal runs without triggerRunId", () => {
    const snapshot: RunWithNodes = {
      run: workflowRun({
        id: "run-1",
        status: "FAILED",
        errorSummary: "Failed to enqueue workflow run on Trigger.dev",
      }),
      nodeRuns: [],
    };

    const next = applyDisconnectedRunFailure(snapshot);
    expect(next.run.status).toBe("FAILED");
    expect(next.run.errorSummary).toBe("Failed to enqueue workflow run on Trigger.dev");
  });

  it("does not modify runs that already have triggerRunId", () => {
    const snapshot: RunWithNodes = {
      run: workflowRun({ id: "run-1", status: "RUNNING", triggerRunId: "tr_run_1" }),
      nodeRuns: [],
    };

    expect(applyDisconnectedRunFailure(snapshot)).toBe(snapshot);
    expect(canUseTriggerRealtime(snapshot.run)).toBe(true);
  });
});
