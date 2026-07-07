import type { NodeRun, RunStatus, WorkflowRun } from "@/lib/types";

export type StatusFilter = "all" | "running" | "completed" | "failed";

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function runDurationMs(run: WorkflowRun): number | null {
  const start = run.startedAt ?? run.createdAt;
  const end = run.finishedAt;
  if (!end) return null;
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
}

export function scopeLabel(scope: WorkflowRun["scope"]): string {
  if (scope === "SELECTION") return "partial";
  return scope.toLowerCase();
}

/** Run-level credit total for history list rows (actual when settled, else estimate). */
export function formatRunCredits(run: WorkflowRun): string | null {
  const credits = run.actualCredits ?? run.estimatedCredits;
  if (credits == null) return null;
  return `${credits.toLocaleString("en-US")} credits`;
}

export function matchesStatusFilter(run: WorkflowRun, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "running") return run.status === "RUNNING" || run.status === "QUEUED";
  if (filter === "completed") return run.status === "SUCCESS";
  if (filter === "failed") return run.status === "FAILED" || run.status === "CANCELLED";
  return true;
}

/** Sort node runs by orchestrator execution order, then startedAt / createdAt. */
export function sortNodeRunsByExecutionOrder(
  nodeRuns: NodeRun[],
  executionOrder?: string[] | null
): NodeRun[] {
  if (!nodeRuns.length) return nodeRuns;

  const orderIndex = new Map<string, number>();
  if (executionOrder?.length) {
    executionOrder.forEach((id, index) => orderIndex.set(id, index));
  }

  return [...nodeRuns].sort((a, b) => {
    const aOrder = orderIndex.get(a.nodeId);
    const bOrder = orderIndex.get(b.nodeId);
    if (aOrder != null && bOrder != null && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    if (aOrder != null && bOrder == null) return -1;
    if (aOrder == null && bOrder != null) return 1;

    const aTime = new Date(a.startedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.startedAt ?? b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.nodeId.localeCompare(b.nodeId);
  });
}

/** Never flash SUCCESS/FAILED before DB payload (input/output/error) exists. */
export function resolveNodeRunDisplayStatus(nr: NodeRun): RunStatus {
  if (
    (nr.status === "SUCCESS" || nr.status === "FAILED") &&
    nr.input == null &&
    nr.output == null &&
    nr.error == null &&
    nr.logPreview == null
  ) {
    return "RUNNING";
  }
  return nr.status;
}

/** Parse node id embedded in orchestrator `Failed at {label} ({nodeId}):` summaries. */
export function parseFailedNodeIdFromSummary(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const match = summary.match(/^Failed at .+ \(([^)]+)\): /);
  return match?.[1] ?? null;
}
