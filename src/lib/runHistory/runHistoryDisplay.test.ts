import { describe, expect, it } from "vitest";
import type { NodeRun } from "@/lib/types";
import { makeNodeRun, makeWorkflowRun } from "@/test/fixtures/workflowRuns";
import {
  formatDurationMs,
  formatRunCredits,
  matchesStatusFilter,
  parseFailedNodeIdFromSummary,
  resolveNodeRunDisplayStatus,
  runDurationMs,
  scopeLabel,
  sortNodeRunsByExecutionOrder,
} from "./runHistoryDisplay";

describe("runHistoryDisplay", () => {
  describe("formatDurationMs", () => {
    it("formats sub-second durations in milliseconds", () => {
      expect(formatDurationMs(450)).toBe("450ms");
    });

    it("formats second-scale durations with one decimal", () => {
      expect(formatDurationMs(2500)).toBe("2.5s");
    });

    it("returns em dash when duration is unknown", () => {
      expect(formatDurationMs(null)).toBe("—");
    });
  });

  describe("runDurationMs", () => {
    it("computes elapsed time from startedAt to finishedAt", () => {
      const run = makeWorkflowRun({
        startedAt: "2026-07-01T10:00:00.000Z",
        finishedAt: "2026-07-01T10:00:02.500Z",
      });
      expect(runDurationMs(run)).toBe(2500);
    });

    it("returns null while a run is still in progress", () => {
      const run = makeWorkflowRun({ finishedAt: null, status: "RUNNING" });
      expect(runDurationMs(run)).toBeNull();
    });
  });

  describe("scopeLabel", () => {
    it("maps execution scopes to display labels", () => {
      expect(scopeLabel("FULL")).toBe("full");
      expect(scopeLabel("SINGLE")).toBe("single");
      expect(scopeLabel("SELECTION")).toBe("partial");
    });
  });

  describe("formatRunCredits", () => {
    it("prefers actual credits over the pre-run estimate", () => {
      expect(
        formatRunCredits(
          makeWorkflowRun({ estimatedCredits: 50_000, actualCredits: 42_000 }),
        ),
      ).toBe("42,000 credits");
    });

    it("falls back to estimated credits while a run is in progress", () => {
      expect(formatRunCredits(makeWorkflowRun({ actualCredits: null, estimatedCredits: 210_000 }))).toBe(
        "210,000 credits",
      );
    });

    it("returns null when no credit data is available", () => {
      expect(
        formatRunCredits(makeWorkflowRun({ estimatedCredits: null, actualCredits: null })),
      ).toBeNull();
    });
  });

  describe("matchesStatusFilter", () => {
    it("includes queued and running runs in the running filter", () => {
      expect(matchesStatusFilter(makeWorkflowRun({ status: "QUEUED" }), "running")).toBe(true);
      expect(matchesStatusFilter(makeWorkflowRun({ status: "RUNNING" }), "running")).toBe(true);
      expect(matchesStatusFilter(makeWorkflowRun({ status: "SUCCESS" }), "running")).toBe(false);
    });

    it("includes failed and cancelled runs in the failed filter", () => {
      expect(matchesStatusFilter(makeWorkflowRun({ status: "FAILED" }), "failed")).toBe(true);
      expect(
        matchesStatusFilter(makeWorkflowRun({ status: "CANCELLED" }), "failed"),
      ).toBe(true);
    });
  });

  describe("resolveNodeRunDisplayStatus", () => {
    it("keeps terminal status hidden until payload arrives", () => {
      const liveSuccess = makeNodeRun({
        status: "SUCCESS",
        input: null,
        output: null,
        error: null,
      });
      expect(resolveNodeRunDisplayStatus(liveSuccess)).toBe("RUNNING");
    });

    it("shows terminal status once output is persisted", () => {
      const settled = makeNodeRun({ status: "SUCCESS", output: { text: "ok" } });
      expect(resolveNodeRunDisplayStatus(settled)).toBe("SUCCESS");
    });

    it("shows terminal status once logs are persisted", () => {
      const failedWithLogs = makeNodeRun({
        status: "FAILED",
        input: null,
        output: null,
        error: null,
        logPreview: "Provider stub TIMEOUT (PROVIDER_TIMEOUT)",
      });
      expect(resolveNodeRunDisplayStatus(failedWithLogs)).toBe("FAILED");
    });
  });

  describe("parseFailedNodeIdFromSummary", () => {
    it("extracts node id from orchestrator summaries", () => {
      expect(
        parseFailedNodeIdFromSummary("Failed at gpt-image-2 (img-1): All providers failed"),
      ).toBe("img-1");
    });

    it("returns null for unrelated summaries", () => {
      expect(parseFailedNodeIdFromSummary("Something went wrong")).toBeNull();
    });
  });

  describe("sortNodeRunsByExecutionOrder", () => {
    it("orders node runs by orchestrator metadata", () => {
      const runs = [
        makeNodeRun({ nodeId: "c", createdAt: "2026-01-01T00:00:02.000Z" }),
        makeNodeRun({ nodeId: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
        makeNodeRun({ nodeId: "b", createdAt: "2026-01-01T00:00:01.000Z" }),
      ];
      const sorted = sortNodeRunsByExecutionOrder(runs, ["a", "b", "c"]);
      expect(sorted.map((nr) => nr.nodeId)).toEqual(["a", "b", "c"]);
    });

    it("falls back to startedAt when execution order is missing", () => {
      const runs = [
        makeNodeRun({
          nodeId: "b",
          startedAt: "2026-01-01T00:00:01.000Z",
          createdAt: "2026-01-01T00:00:01.000Z",
        }),
        makeNodeRun({
          nodeId: "a",
          startedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ];
      const sorted = sortNodeRunsByExecutionOrder(runs, null);
      expect(sorted.map((nr) => nr.nodeId)).toEqual(["a", "b"]);
    });
  });
});

describe("runHistoryDisplay node fixtures", () => {
  it("builds reusable node run fixtures", () => {
    const node: NodeRun = makeNodeRun({ nodeId: "node-b" });
    expect(node.nodeId).toBe("node-b");
  });
});
