import type { NodeRun, RunStatus } from "@/lib/types";

function isTerminalStatus(status: RunStatus): boolean {
  return (
    status === "SUCCESS" ||
    status === "FAILED" ||
    status === "SKIPPED" ||
    status === "CANCELLED"
  );
}

/**
 * Prefer DB terminal status; otherwise keep live RUNNING over non-terminal DB rows.
 */
export function pickMergedNodeRunStatus(
  live: NodeRun | undefined,
  db: NodeRun,
): RunStatus {
  if (isTerminalStatus(db.status)) return db.status;
  if (live?.status === "RUNNING") return "RUNNING";
  return db.status;
}

function jsonFieldEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function preferDbField<T>(dbValue: T | null | undefined, liveValue: T | null | undefined): T | null {
  if (dbValue !== null && dbValue !== undefined) {
    // Keep the live reference when payloads are equal so React can skip work.
    if (jsonFieldEqual(dbValue, liveValue)) {
      return (liveValue ?? dbValue) as T;
    }
    return dbValue;
  }
  if (liveValue !== null && liveValue !== undefined) return liveValue;
  return null;
}

function sameProviderAttempts(
  a: NodeRun["providerAttempts"],
  b: NodeRun["providerAttempts"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return a == null && b == null;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.id !== right.id ||
      left.provider !== right.provider ||
      left.status !== right.status ||
      left.durationMs !== right.durationMs ||
      left.error !== right.error ||
      left.errorCode !== right.errorCode
    ) {
      return false;
    }
  }
  return true;
}

/** True when two node-run rows are visually/semantically identical. */
export function nodeRunsEqual(a: NodeRun[], b: NodeRun[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.id !== right.id ||
      left.nodeId !== right.nodeId ||
      left.nodeType !== right.nodeType ||
      left.status !== right.status ||
      left.startedAt !== right.startedAt ||
      left.finishedAt !== right.finishedAt ||
      left.provider !== right.provider ||
      left.estimatedCredits !== right.estimatedCredits ||
      left.actualCredits !== right.actualCredits ||
      !jsonFieldEqual(left.input, right.input) ||
      !jsonFieldEqual(left.output, right.output) ||
      !jsonFieldEqual(left.error, right.error) ||
      !jsonFieldEqual(left.resolvedInput, right.resolvedInput) ||
      !jsonFieldEqual(left.resolvedOutput, right.resolvedOutput) ||
      left.logPreview !== right.logPreview ||
      !sameProviderAttempts(left.providerAttempts, right.providerAttempts)
    ) {
      return false;
    }
  }
  return true;
}

function mergeNodeRun(live: NodeRun | undefined, db: NodeRun): NodeRun {
  // Keep the first id we assigned so React keys / expand state stay stable
  // across live → DB merges.
  const id = live?.id ?? db.id;
  const status = pickMergedNodeRunStatus(live, db);
  const input = preferDbField(db.input, live?.input);
  const output = preferDbField(db.output, live?.output);
  const error = preferDbField(db.error, live?.error);
  const resolvedInput = preferDbField(db.resolvedInput, live?.resolvedInput);
  const resolvedOutput = preferDbField(db.resolvedOutput, live?.resolvedOutput);
  const startedAt = preferDbField(db.startedAt, live?.startedAt);
  const finishedAt = preferDbField(db.finishedAt, live?.finishedAt);
  const provider = preferDbField(db.provider, live?.provider);
  const estimatedCredits = preferDbField(db.estimatedCredits, live?.estimatedCredits);
  const actualCredits = preferDbField(db.actualCredits, live?.actualCredits);
  const logPreview = preferDbField(db.logPreview, live?.logPreview);
  const providerAttempts = db.providerAttempts ?? live?.providerAttempts;

  if (
    live &&
    live.id === id &&
    live.status === status &&
    live.input === input &&
    live.output === output &&
    live.error === error &&
    live.resolvedInput === resolvedInput &&
    live.resolvedOutput === resolvedOutput &&
    live.startedAt === startedAt &&
    live.finishedAt === finishedAt &&
    live.provider === provider &&
    live.estimatedCredits === estimatedCredits &&
    live.actualCredits === actualCredits &&
    live.logPreview === logPreview &&
    live.nodeType === db.nodeType &&
    (live.providerAttempts === providerAttempts ||
      sameProviderAttempts(live.providerAttempts, providerAttempts))
  ) {
    return live;
  }

  return {
    ...db,
    id,
    status,
    input,
    output,
    error,
    resolvedInput,
    resolvedOutput,
    startedAt,
    finishedAt,
    provider,
    estimatedCredits,
    actualCredits,
    logPreview,
    providerAttempts,
  };
}

/**
 * Merge authoritative DB node runs into a live list.
 * Preserves realtime-only RUNNING rows not yet present in the DB payload.
 * DB row order (createdAt asc from API) is authoritative over stale live order.
 */
export function mergeDbNodeRunsIntoLive(prev: NodeRun[], fromDb: NodeRun[]): NodeRun[] {
  const byNodeId = new Map<string, NodeRun>();
  for (const live of prev) {
    byNodeId.set(live.nodeId, live);
  }

  const order: string[] = fromDb.map((db) => db.nodeId);
  for (const live of prev) {
    if (!order.includes(live.nodeId)) order.push(live.nodeId);
  }
  let changed = fromDb.some((db) => !byNodeId.has(db.nodeId));

  for (const db of fromDb) {
    const merged = mergeNodeRun(byNodeId.get(db.nodeId), db);
    if (merged !== byNodeId.get(db.nodeId)) changed = true;
    byNodeId.set(db.nodeId, merged);
  }

  if (!changed && order.length === prev.length && order.every((id, i) => prev[i]?.nodeId === id)) {
    return prev;
  }

  return order
    .map((nodeId) => byNodeId.get(nodeId))
    .filter((nr): nr is NodeRun => nr != null);
}

/** Live status-only rows (no I/O yet) — ignore terminal statuses until DB backs them. */
export function isLiveOnlyNodeRun(nr: NodeRun): boolean {
  return (
    nr.input == null &&
    nr.output == null &&
    nr.error == null &&
    nr.startedAt == null &&
    nr.finishedAt == null &&
    nr.provider == null &&
    (nr.providerAttempts == null || nr.providerAttempts.length === 0)
  );
}

export function isLiveOnlyPayload(nodeRuns: NodeRun[]): boolean {
  return nodeRuns.length > 0 && nodeRuns.every(isLiveOnlyNodeRun);
}

/**
 * Upsert non-terminal live rows; ignore live SUCCESS/FAILED until DB I/O arrives.
 * Incoming `liveRows` order reflects orchestrator execution order when provided by realtime.
 */
export function upsertLiveNodeRuns(prev: NodeRun[], liveRows: NodeRun[]): NodeRun[] {
  const byNodeId = new Map<string, NodeRun>();
  for (const nr of prev) {
    byNodeId.set(nr.nodeId, nr);
  }

  const order: string[] = [];
  for (const live of liveRows) {
    if (!order.includes(live.nodeId)) order.push(live.nodeId);
  }
  for (const nr of prev) {
    if (!order.includes(nr.nodeId)) order.push(nr.nodeId);
  }
  let changed = false;

  for (const live of liveRows) {
    const existing = byNodeId.get(live.nodeId);
    if (live.status === "SUCCESS" || live.status === "FAILED" || live.status === "CANCELLED") {
      if (existing && !isLiveOnlyNodeRun(existing)) continue;
    }

    if (existing && !isLiveOnlyNodeRun(existing)) {
      if (!isTerminalStatus(existing.status) && existing.status !== live.status) {
        byNodeId.set(live.nodeId, { ...existing, status: live.status });
        changed = true;
      }
      continue;
    }

    if (!order.includes(live.nodeId)) {
      order.push(live.nodeId);
      changed = true;
    }

    if (existing) {
      if (existing.status !== live.status) {
        byNodeId.set(live.nodeId, { ...existing, status: live.status });
        changed = true;
      }
    } else {
      byNodeId.set(live.nodeId, live);
      changed = true;
    }
  }

  if (!changed && order.length === prev.length && order.every((id, i) => prev[i]?.nodeId === id)) {
    return prev;
  }

  return order
    .map((nodeId) => byNodeId.get(nodeId))
    .filter((nr): nr is NodeRun => nr != null);
}
