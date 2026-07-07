import type { NodeRun, WorkflowRun } from "@/lib/types";
import {
  isLiveOnlyPayload,
  mergeDbNodeRunsIntoLive,
  upsertLiveNodeRuns,
} from "./mergeDbNodeRunsIntoLive";

export type ExecutionState = {
  currentRunId: string | null;
  history: WorkflowRun[];
  nodeRuns: NodeRun[];
  nodeStatuses: Record<string, "IDLE" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED">;
};

export type ExecutionAction =
  | { type: "history_set"; history: WorkflowRun[] }
  | { type: "run_created"; run: WorkflowRun }
  | { type: "run_updated"; run: WorkflowRun }
  | { type: "node_runs_received"; runId: string; nodeRuns: NodeRun[] }
  | { type: "node_status"; nodeId: string; status: ExecutionState["nodeStatuses"][string] }
  | { type: "clear_node_statuses" };

function runsVisuallyEqual(a: WorkflowRun, b: WorkflowRun): boolean {
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.scope === b.scope &&
    a.errorSummary === b.errorSummary &&
    a.startedAt === b.startedAt &&
    a.finishedAt === b.finishedAt &&
    a.updatedAt === b.updatedAt &&
    a.triggerRunId === b.triggerRunId &&
    a.createdAt === b.createdAt
  );
}

function upsertRun(history: WorkflowRun[], run: WorkflowRun): WorkflowRun[] {
  const index = history.findIndex((r) => r.id === run.id);
  if (index === -1) return [run, ...history];
  const existing = history[index]!;
  if (runsVisuallyEqual(existing, run)) return history;
  const next = history.slice();
  next[index] = run;
  return next;
}

function nodeStatusesEqual(
  a: ExecutionState["nodeStatuses"],
  b: ExecutionState["nodeStatuses"],
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function executionReducer(state: ExecutionState, action: ExecutionAction): ExecutionState {
  switch (action.type) {
    case "history_set": {
      if (
        state.history.length === action.history.length &&
        state.history.every((run, i) => {
          const next = action.history[i];
          return next != null && runsVisuallyEqual(run, next);
        })
      ) {
        return state;
      }
      return { ...state, history: action.history };
    }
    case "run_created":
      return {
        ...state,
        currentRunId: action.run.id,
        nodeRuns: [],
        history: upsertRun(state.history, action.run),
      };
    case "run_updated": {
      const history = upsertRun(state.history, action.run);
      if (history === state.history) return state;
      return { ...state, history };
    }
    case "node_runs_received": {
      const run = state.history.find((r) => r.id === action.runId);
      const runTerminal =
        run?.status === "SUCCESS" ||
        run?.status === "FAILED" ||
        run?.status === "CANCELLED";

      const nodeRuns =
        action.runId === state.currentRunId
          ? isLiveOnlyPayload(action.nodeRuns)
            ? upsertLiveNodeRuns(state.nodeRuns, action.nodeRuns)
            : mergeDbNodeRunsIntoLive(state.nodeRuns, action.nodeRuns)
          : state.nodeRuns;

      if (runTerminal) {
        if (Object.keys(state.nodeStatuses).length === 0) {
          return nodeRuns === state.nodeRuns ? state : { ...state, nodeRuns };
        }
        return { ...state, nodeStatuses: {}, nodeRuns };
      }

      const nodeStatuses: ExecutionState["nodeStatuses"] = { ...state.nodeStatuses };
      for (const nr of action.nodeRuns) {
        if (nr.status === "RUNNING") {
          nodeStatuses[nr.nodeId] = "RUNNING";
        } else if (nr.status === "FAILED") {
          nodeStatuses[nr.nodeId] = "FAILED";
        } else {
          delete nodeStatuses[nr.nodeId];
        }
      }
      if (nodeStatusesEqual(state.nodeStatuses, nodeStatuses)) {
        return nodeRuns === state.nodeRuns ? state : { ...state, nodeRuns };
      }
      return { ...state, nodeStatuses, nodeRuns };
    }
    case "node_status": {
      if (state.nodeStatuses[action.nodeId] === action.status) return state;
      return { ...state, nodeStatuses: { ...state.nodeStatuses, [action.nodeId]: action.status } };
    }
    case "clear_node_statuses":
      if (Object.keys(state.nodeStatuses).length === 0) return state;
      return { ...state, nodeStatuses: {} };
    default:
      return state;
  }
}

export function createInitialExecutionState(): ExecutionState {
  return {
    currentRunId: null,
    history: [],
    nodeRuns: [],
    nodeStatuses: {},
  };
}
