/** Vendored stub — no Prisma or server-only imports in the frontend bundle. */
export type ProviderAttemptStatus = "pending" | "success" | "failed";

export type NodeRunLogBuffer = {
  append: (line: string) => void;
};

/** Frontend-safe provider execution context (no server runtime imports). */
export type ProviderAttemptRecord = {
  provider: string;
  status: ProviderAttemptStatus;
  durationMs: number;
  error?: string;
  errorCode?: string;
};

export type RunProviderChainHooks = {
  onAttempt?: (attempt: ProviderAttemptRecord) => Promise<void>;
};

export type ProviderContext = {
  workflowRunId: string;
  nodeId: string;
  nodeRunId?: string;
  model?: string;
  hooks?: RunProviderChainHooks;
  log?: NodeRunLogBuffer;
};
