import { describe, expect, it } from "vitest";
import type { NodeRun } from "@/lib/types";
import {
  mergeDbNodeRunsIntoLive,
  pickMergedNodeRunStatus,
  upsertLiveNodeRuns,
} from "./mergeDbNodeRunsIntoLive";

function nodeRun(partial: Partial<NodeRun> & Pick<NodeRun, "id" | "nodeId" | "status">): NodeRun {
  return {
    workflowRunId: "run-1",
    nodeType: "llm",
    attempt: 1,
    startedAt: null,
    finishedAt: null,
    resolvedInput: null,
    resolvedOutput: null,
    input: null,
    output: null,
    provider: null,
    error: null,
    estimatedCredits: null,
    actualCredits: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("pickMergedNodeRunStatus", () => {
  it("prefers DB terminal status", () => {
    const live = nodeRun({ id: "live", nodeId: "n1", status: "RUNNING" });
    const db = nodeRun({ id: "db", nodeId: "n1", status: "SUCCESS" });
    expect(pickMergedNodeRunStatus(live, db)).toBe("SUCCESS");
  });

  it("prefers live RUNNING over non-terminal DB", () => {
    const live = nodeRun({ id: "live", nodeId: "n1", status: "RUNNING" });
    const db = nodeRun({ id: "db", nodeId: "n1", status: "QUEUED" });
    expect(pickMergedNodeRunStatus(live, db)).toBe("RUNNING");
  });
});

describe("mergeDbNodeRunsIntoLive", () => {
  it("preserves live-only RUNNING rows and prefers DB I/O", () => {
    const liveOnly = nodeRun({ id: "live-b", nodeId: "b", status: "RUNNING" });
    const liveA = nodeRun({ id: "live-a", nodeId: "a", status: "RUNNING" });
    const dbA = nodeRun({
      id: "db-a",
      nodeId: "a",
      status: "SUCCESS",
      input: { prompt: "hi" },
      output: { text: "ok" },
    });

    const merged = mergeDbNodeRunsIntoLive([liveA, liveOnly], [dbA]);
    expect(merged.map((nr) => nr.nodeId)).toEqual(["a", "b"]);
    // Preserve the first-assigned id so list keys stay stable across live → DB merges.
    expect(merged[0]?.id).toBe("live-a");
    expect(merged[0]?.status).toBe("SUCCESS");
    expect(merged[0]?.input).toEqual({ prompt: "hi" });
    expect(merged[1]?.status).toBe("RUNNING");
  });

  it("prefers DB row order over stale live order", () => {
    const liveB = nodeRun({ id: "live-b", nodeId: "b", status: "RUNNING" });
    const liveA = nodeRun({ id: "live-a", nodeId: "a", status: "SUCCESS" });
    const dbA = nodeRun({ id: "db-a", nodeId: "a", status: "SUCCESS" });
    const dbB = nodeRun({
      id: "db-b",
      nodeId: "b",
      status: "SUCCESS",
      createdAt: "2026-01-01T00:00:01.000Z",
    });

    const merged = mergeDbNodeRunsIntoLive([liveB, liveA], [dbA, dbB]);
    expect(merged.map((nr) => nr.nodeId)).toEqual(["a", "b"]);
  });

  it("keeps stable order when DB data matches live rows", () => {
    const liveA = nodeRun({
      id: "live-a",
      nodeId: "a",
      status: "SUCCESS",
      input: { prompt: "hi" },
      output: { text: "ok" },
      logPreview: null,
    });
    const dbA = nodeRun({
      id: "db-a",
      nodeId: "a",
      status: "SUCCESS",
      input: { prompt: "hi" },
      output: { text: "ok" },
      logPreview: null,
    });
    const prev = [liveA];
    const merged = mergeDbNodeRunsIntoLive(prev, [dbA]);
    expect(merged).toBe(prev);
  });
});

describe("upsertLiveNodeRuns", () => {
  it("upserts live SUCCESS when no DB-backed row exists yet", () => {
    const prev = [nodeRun({ id: "a", nodeId: "a", status: "RUNNING" })];
    const next = upsertLiveNodeRuns(prev, [
      nodeRun({ id: "a-live", nodeId: "a", status: "SUCCESS" }),
      nodeRun({ id: "b-live", nodeId: "b", status: "RUNNING" }),
    ]);
    expect(next).toHaveLength(2);
    expect(next[0]?.status).toBe("SUCCESS");
    expect(next[1]?.nodeId).toBe("b");
  });

  it("ignores live SUCCESS when DB-backed row already exists", () => {
    const prev = [
      nodeRun({
        id: "a",
        nodeId: "a",
        status: "SUCCESS",
        input: { prompt: "hi" },
        output: { text: "ok" },
      }),
    ];
    const next = upsertLiveNodeRuns(prev, [
      nodeRun({ id: "a-live", nodeId: "a", status: "FAILED" }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]?.status).toBe("SUCCESS");
  });
});
