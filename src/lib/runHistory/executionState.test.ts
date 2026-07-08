import { describe, expect, it } from "vitest";
import {
  createInitialExecutionState,
  executionReducer,
} from "./executionState";
import { makeNodeRun, makeWorkflowRun } from "@/test/fixtures/workflowRuns";

describe("executionReducer", () => {
  it("loads persisted history without disturbing the current run pointer", () => {
    const initial = createInitialExecutionState();
    const history = [makeWorkflowRun({ id: "run-old" })];

    const next = executionReducer(initial, { type: "history_set", history });

    expect(next.history).toEqual(history);
    expect(next.currentRunId).toBeNull();
  });

  it("prepends a newly created run and tracks it as current", () => {
    const initial = createInitialExecutionState();
    const run = makeWorkflowRun({ id: "run-new", status: "QUEUED" });

    const next = executionReducer(initial, { type: "run_created", run });

    expect(next.currentRunId).toBe("run-new");
    expect(next.history[0]?.id).toBe("run-new");
    expect(next.nodeRuns).toEqual([]);
  });

  it("upserts live status updates into history", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "QUEUED" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "run_updated",
      run: { ...run, status: "RUNNING" },
    });

    expect(state.history[0]?.status).toBe("RUNNING");
  });

  it("merges live-only node statuses for the active run", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "RUNNING" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [
        makeNodeRun({
          id: "live-a",
          nodeId: "node-a",
          status: "RUNNING",
          input: null,
          output: null,
        }),
      ],
    });

    expect(state.nodeStatuses["node-a"]).toBe("RUNNING");
    expect(state.nodeRuns).toHaveLength(1);
    expect(state.nodeRuns[0]?.nodeId).toBe("node-a");
  });

  it("hydrates DB node runs without dropping live-only rows", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "RUNNING" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [
        makeNodeRun({
          id: "live-a",
          nodeId: "node-a",
          status: "RUNNING",
          input: null,
          output: null,
        }),
        makeNodeRun({
          id: "live-b",
          nodeId: "node-b",
          status: "RUNNING",
          input: null,
          output: null,
        }),
      ],
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [
        makeNodeRun({
          id: "db-a",
          nodeId: "node-a",
          status: "SUCCESS",
          input: { prompt: "hi" },
          output: { text: "ok" },
        }),
      ],
    });

    expect(state.nodeRuns.map((nr) => nr.nodeId)).toEqual(["node-a", "node-b"]);
    expect(state.nodeRuns[0]?.status).toBe("SUCCESS");
    expect(state.nodeRuns[0]?.output).toEqual({ text: "ok" });
    expect(state.nodeStatuses).toEqual({ "node-b": "RUNNING" });
  });

  it("keeps failed node status visible while the run is still active", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "RUNNING" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [makeNodeRun({ nodeId: "node-a", status: "FAILED", input: null, output: null })],
    });

    expect(state.nodeStatuses["node-a"]).toBe("FAILED");
  });

  it("does not downgrade a terminal run back to running on stale updates", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "RUNNING" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "run_updated",
      run: {
        ...run,
        status: "FAILED",
        finishedAt: "2026-07-01T10:00:05.000Z",
        errorSummary: "Failed at gpt-image-2 (img-1)",
      },
    });

    state = executionReducer(state, {
      type: "run_updated",
      run: { ...run, status: "RUNNING" },
    });

    expect(state.history[0]?.status).toBe("FAILED");
    expect(state.history[0]?.finishedAt).toBe("2026-07-01T10:00:05.000Z");
  });

  it("clears live node glow once the run reaches a terminal state", () => {
    const run = makeWorkflowRun({ id: "run-live", status: "RUNNING" });
    let state = executionReducer(createInitialExecutionState(), {
      type: "run_created",
      run,
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [makeNodeRun({ nodeId: "node-a", status: "RUNNING", input: null, output: null })],
    });

    state = executionReducer(state, {
      type: "run_updated",
      run: { ...run, status: "SUCCESS", finishedAt: "2026-07-01T10:00:05.000Z" },
    });

    state = executionReducer(state, {
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [makeNodeRun({ nodeId: "node-a", status: "SUCCESS" })],
    });

    expect(state.nodeStatuses).toEqual({});
  });
});
