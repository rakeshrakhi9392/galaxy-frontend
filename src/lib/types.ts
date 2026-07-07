export type { WorkflowListItem, WorkflowDocument as Workflow } from "@galaxy/schemas";

export type IsoDateString = string;

export type RunStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "SKIPPED";

/** SELECTION is the stored label for multi-select ("partial") runs. */
export type WorkflowRunScope = "FULL" | "SINGLE" | "SELECTION";
export type RunInitiator = "UI" | "API" | "MCP";

export type WorkflowRun = {
  id: string;
  workflowId: string;
  scope: WorkflowRunScope;
  status: RunStatus;
  initiator: RunInitiator;
  targetNodeIds: string[];
  triggerRunId: string | null;
  estimatedCredits: number | null;
  actualCredits: number | null;
  startedAt: IsoDateString | null;
  finishedAt: IsoDateString | null;
  errorSummary: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type ProviderAttempt = {
  id: string;
  nodeRunId: string;
  provider: string;
  status: "SUCCESS" | "FAILED" | "TIMEOUT" | "SKIPPED";
  durationMs: number | null;
  error: string | null;
  errorCode: string | null;
  createdAt: IsoDateString;
};

export type NodeRun = {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  attempt: number;
  status: RunStatus;
  startedAt: IsoDateString | null;
  finishedAt: IsoDateString | null;
  resolvedInput: unknown | null;
  resolvedOutput: unknown | null;
  input: unknown | null;
  output: unknown | null;
  provider: string | null;
  error: unknown | null;
  logPreview?: string | null;
  estimatedCredits: number | null;
  actualCredits: number | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  providerAttempts?: ProviderAttempt[];
};

export type RunWithNodes = {
  run: WorkflowRun;
  nodeRuns: NodeRun[];
};

export type CreditTxnType = "GRANT" | "RUN_CHARGE" | "RUN_REFUND" | "ADJUSTMENT";

export type CreditTransaction = {
  id: string;
  type: CreditTxnType;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  workflowRunId: string | null;
  metadata: unknown | null;
  createdAt: IsoDateString;
};

export type WorkflowGraph = {
  nodes: Array<unknown>;
  edges: Array<unknown>;
  viewport?: unknown;
};
