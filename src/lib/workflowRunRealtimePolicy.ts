import type { RunWithNodes } from "./types";

export const RUN_NOT_CONNECTED_MESSAGE =
  "Workflow run is not connected to Trigger.dev. Verify TRIGGER_SECRET_KEY and that the Trigger worker is running.";

/**
 * Active runs must have a Trigger connection for realtime updates.
 * Without `triggerRunId`, polling cannot recover execution — surface a terminal failure.
 */
export function applyDisconnectedRunFailure(snapshot: RunWithNodes): RunWithNodes {
  const { run } = snapshot;

  if (run.triggerRunId) return snapshot;
  if (run.status !== "QUEUED" && run.status !== "RUNNING") return snapshot;

  return {
    ...snapshot,
    run: {
      ...run,
      status: "FAILED",
      errorSummary: run.errorSummary ?? RUN_NOT_CONNECTED_MESSAGE,
    },
  };
}

export function canUseTriggerRealtime(run: RunWithNodes["run"] | null | undefined): boolean {
  return Boolean(run?.triggerRunId);
}
