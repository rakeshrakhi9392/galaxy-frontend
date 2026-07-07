/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RunWithNodes } from "@/lib/types";
import { RunHistory } from "./RunHistory";
import { makeNodeRun, makeWorkflowRun } from "@/test/fixtures/workflowRuns";
import type { ExecutionState } from "@/lib/runHistory/executionState";

const mockClientFetch = vi.fn();
let realtimeOnUpdate: ((payload: RunWithNodes) => void) | null = null;

vi.mock("@/lib/useClientApi", () => ({
  useClientApi: () => ({ clientFetch: mockClientFetch }),
}));

vi.mock("@/lib/useWorkflowRunRealtime", () => ({
  useWorkflowRunRealtime: (args: { onUpdate: (payload: RunWithNodes) => void }) => {
    realtimeOnUpdate = args.onUpdate;
  },
}));

function makeExecution(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    currentRunId: null,
    history: [],
    nodeRuns: [],
    nodeStatuses: {},
    ...overrides,
  };
}

function mockFetchHandlers(handlers: {
  runs?: { runs: ReturnType<typeof makeWorkflowRun>[] };
  runDetails?: Record<string, RunWithNodes>;
}) {
  mockClientFetch.mockImplementation(async (path: string) => {
    if (path.endsWith("/runs") && !path.includes("/runs/run-")) {
      return {
        ok: true,
        json: async () => handlers.runs ?? { runs: [] },
      };
    }

    const runDetailMatch = path.match(/\/runs\/([^/]+)$/);
    if (runDetailMatch) {
      const runId = runDetailMatch[1]!;
      const payload = handlers.runDetails?.[runId];
      if (!payload) {
        throw new Error(`Unexpected run detail fetch: ${path}`);
      }
      return {
        ok: true,
        json: async () => payload,
      };
    }

    throw new Error(`Unexpected fetch path: ${path}`);
  });
}

describe("RunHistory", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockClientFetch.mockReset();
    realtimeOnUpdate = null;
  });

  it("loads runs on mount and renders status, scope, and duration", async () => {
    const successRun = makeWorkflowRun({
      id: "run-success",
      status: "SUCCESS",
      scope: "FULL",
      startedAt: "2026-07-01T10:00:00.000Z",
      finishedAt: "2026-07-01T10:00:02.500Z",
    });
    const singleRun = makeWorkflowRun({
      id: "run-single",
      status: "RUNNING",
      scope: "SINGLE",
      finishedAt: null,
    });

    mockFetchHandlers({
      runs: { runs: [successRun, singleRun] },
    });

    const dispatch = vi.fn();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ history: [successRun, singleRun] })}
        dispatch={dispatch}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: "history_set",
        history: [successRun, singleRun],
      });
    });

    expect(screen.getByText("full")).toBeInTheDocument();
    expect(screen.getByText("single")).toBeInTheDocument();
    expect(screen.getByText("2.5s")).toBeInTheDocument();
    expect(screen.getAllByText("10 credits")).toHaveLength(2);
    expect(document.getElementById("run-status-run-single")).toHaveTextContent("RUNNING");
  });

  it("filters runs by status", async () => {
    const successRun = makeWorkflowRun({ id: "run-success", status: "SUCCESS" });
    const runningRun = makeWorkflowRun({
      id: "run-running",
      status: "RUNNING",
      finishedAt: null,
    });

    mockFetchHandlers({ runs: { runs: [successRun, runningRun] } });

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ history: [successRun, runningRun] })}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("run-status-run-success")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Completed" }));

    expect(document.getElementById("run-status-run-success")).toBeInTheDocument();
    expect(document.getElementById("run-status-run-running")).not.toBeInTheDocument();
  });

  it("expands a run and shows node-level details", async () => {
    const run = makeWorkflowRun({ id: "run-detail", status: "SUCCESS" });
    const nodeRun = makeNodeRun({
      nodeId: "node-a",
      nodeType: "llm",
      input: { prompt: "hello" },
      output: { text: "world" },
    });

    mockFetchHandlers({
      runs: { runs: [run] },
      runDetails: {
        "run-detail": { run, nodeRuns: [nodeRun] },
      },
    });

    const user = userEvent.setup();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ history: [run] })}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("run-status-run-detail")).toBeInTheDocument();
    });
    const expandButton = document.querySelector(
      '[aria-controls="run-node-runs-run-detail"]',
    ) as HTMLButtonElement;
    await user.click(expandButton);

    expect(await screen.findByText("llm")).toBeInTheDocument();
    expect(screen.getByText("node-a")).toBeInTheDocument();
    expect(screen.getByText("Inputs used")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("dispatches live updates from realtime hook", async () => {
    const run = makeWorkflowRun({
      id: "run-live",
      status: "QUEUED",
      finishedAt: null,
    });

    mockFetchHandlers({ runs: { runs: [run] } });

    const dispatch = vi.fn();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ currentRunId: "run-live", history: [run] })}
        dispatch={dispatch}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => expect(realtimeOnUpdate).not.toBeNull());

    const liveNode = makeNodeRun({
      id: "live-node-a",
      nodeId: "node-a",
      status: "RUNNING",
      input: null,
      output: null,
    });

    realtimeOnUpdate?.({
      run: { ...run, status: "RUNNING" },
      nodeRuns: [liveNode],
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "run_updated",
      run: expect.objectContaining({ id: "run-live", status: "RUNNING" }),
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "node_runs_received",
      runId: "run-live",
      nodeRuns: [liveNode],
    });
  });

  it("calls onClose when Close is clicked", async () => {
    mockFetchHandlers({ runs: { runs: [] } });
    const onClose = vi.fn();
    const user = userEvent.setup();

    const view = render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution()}
        dispatch={vi.fn()}
        onClose={onClose}
        runCompletedTick={0}
      />,
    );

    await user.click(within(view.container).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows an empty-state message when the filter excludes all runs", async () => {
    const failedRun = makeWorkflowRun({ id: "run-failed", status: "FAILED" });

    mockFetchHandlers({ runs: { runs: [failedRun] } });

    const user = userEvent.setup();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ history: [failedRun] })}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("run-status-run-failed")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Completed" }));

    expect(screen.getByText("No runs for this filter yet.")).toBeInTheDocument();
  });

  it("surfaces fetch errors in the panel", async () => {
    mockClientFetch.mockRejectedValueOnce(new Error("Network down"));

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution()}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    expect(await screen.findByText("Network down")).toBeInTheDocument();
  });

  it("shows provider attempts, error codes, and logs for a failed node run", async () => {
    const run = makeWorkflowRun({
      id: "run-failed",
      status: "FAILED",
      errorSummary: "Failed at gpt-image-2 (img-1): All providers failed",
    });
    const nodeRun = makeNodeRun({
      nodeId: "img-1",
      nodeType: "gpt-image-2",
      status: "FAILED",
      output: null,
      error: { message: "All providers failed" },
      logPreview:
        "Provider openai-gpt-image-2-stub TIMEOUT (PROVIDER_TIMEOUT): timed out\nProvider openai-gpt-image-2-fallback-stub TIMEOUT (PROVIDER_TIMEOUT): timed out",
      providerAttempts: [
        {
          id: "pa-1",
          nodeRunId: "nr-1",
          provider: "openai-gpt-image-2-stub",
          status: "TIMEOUT",
          durationMs: 120_000,
          error: "Waitpoint token timed out after 120s",
          errorCode: "PROVIDER_TIMEOUT",
          createdAt: "2026-07-01T10:00:01.000Z",
        },
        {
          id: "pa-2",
          nodeRunId: "nr-1",
          provider: "openai-gpt-image-2-fallback-stub",
          status: "TIMEOUT",
          durationMs: 120_000,
          error: "Waitpoint token timed out after 120s",
          errorCode: "PROVIDER_TIMEOUT",
          createdAt: "2026-07-01T10:00:02.000Z",
        },
      ],
    });

    mockFetchHandlers({
      runs: { runs: [run] },
      runDetails: {
        "run-failed": { run, nodeRuns: [nodeRun] },
      },
    });

    const user = userEvent.setup();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ history: [run] })}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("run-status-run-failed")).toBeInTheDocument();
    });

    const expandButton = document.querySelector(
      '[aria-controls="run-node-runs-run-failed"]',
    ) as HTMLButtonElement;
    await user.click(expandButton);

    expect(await screen.findByText("Provider attempts")).toBeInTheDocument();
    expect(screen.getByText(/All providers failed/)).toBeInTheDocument();
    expect(screen.getAllByText("PROVIDER_TIMEOUT")).toHaveLength(2);
    expect(screen.getByText("Logs")).toBeInTheDocument();
    expect(screen.getByText(/openai-gpt-image-2-fallback-stub TIMEOUT/)).toBeInTheDocument();
  });
});

describe("RunHistory selected run integration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockClientFetch.mockReset();
    realtimeOnUpdate = null;
  });

  it("updates expanded node cards when realtime events arrive for the selected run", async () => {
    const run = makeWorkflowRun({
      id: "run-live",
      status: "RUNNING",
      finishedAt: null,
    });
    const liveNode = makeNodeRun({
      id: "live-node-a",
      nodeId: "node-a",
      nodeType: "llm",
      status: "RUNNING",
      input: null,
      output: null,
    });

    mockFetchHandlers({
      runs: { runs: [run] },
      runDetails: {
        "run-live": { run, nodeRuns: [liveNode] },
      },
    });

    const user = userEvent.setup();

    render(
      <RunHistory
        workflowId="wf-1"
        execution={makeExecution({ currentRunId: "run-live", history: [run] })}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        runCompletedTick={0}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById("run-status-run-live")).toHaveTextContent("RUNNING");
    });

    const region = await screen.findByRole("region", { name: /RUNNING/i });
    expect(within(region).getByText("llm")).toBeInTheDocument();

    realtimeOnUpdate?.({
      run: { ...run, status: "RUNNING" },
      nodeRuns: [liveNode],
    });

    await waitFor(() => {
      expect(within(region).getAllByText("RUNNING").length).toBeGreaterThan(0);
    });
  });
});
