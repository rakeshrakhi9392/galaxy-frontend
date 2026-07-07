"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlignLeft, Clock, Loader2, Play, Search } from "lucide-react";
import type { NodeRun, RunWithNodes, Workflow, WorkflowRun } from "@/lib/types";
import { useClientApi } from "@/lib/useClientApi";
import { RunStatusBadge } from "@/components/workflows/RunStatusBadge";
import {
  applyPlaygroundInputsToGraph,
  estimatePlaygroundCredits,
  extractPlaygroundInputs,
  getPlaygroundInputValues,
} from "@/lib/workflows/playgroundInputs";

type RunSourceFilter = "UI" | "API";

function formatRunDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortRunId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function extractOutputFromNodeRuns(nodeRuns: NodeRun[]): unknown {
  const responseRun = nodeRuns.find((nr) => nr.nodeType === "response" && nr.status === "SUCCESS");
  if (responseRun?.output) {
    const out = responseRun.output as { results?: Record<string, unknown> | unknown[] };
    if (out.results && typeof out.results === "object" && !Array.isArray(out.results)) {
      const entries = Object.entries(out.results);
      if (entries.length === 1) return entries[0]![1];
      return out.results;
    }
    if (Array.isArray(out.results)) return out.results.length === 1 ? out.results[0] : out.results;
    return responseRun.output;
  }
  const legacyOutput = nodeRuns.find((nr) => nr.nodeType === "output" && nr.status === "SUCCESS");
  if (!legacyOutput?.output) return null;
  const out = legacyOutput.output as Record<string, unknown>;
  if (out.value != null) return out.value;
  return legacyOutput.output;
}

function renderOutput(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") {
    return (
      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">{value}</pre>
    );
  }
  return (
    <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function PlaygroundRunHistory({
  workflowId,
  runCompletedTick,
}: {
  workflowId: string;
  runCompletedTick: number;
}) {
  const { clientFetch } = useClientApi();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [sourceFilter, setSourceFilter] = useState<RunSourceFilter>("UI");
  const [search, setSearch] = useState("");

  const fetchRuns = useCallback(async () => {
    try {
      const res = await clientFetch(`/api/v1/workflows/${workflowId}/runs`);
      const json = (await res.json()) as { runs: WorkflowRun[] };
      setRuns(json.runs);
    } catch {
      // ignore
    }
  }, [workflowId, clientFetch]);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns, runCompletedTick]);

  const filteredRuns = useMemo(() => {
    const initiator = sourceFilter === "UI" ? "UI" : "API";
    return runs
      .filter((run) => run.initiator === initiator)
      .filter((run) => !search.trim() || run.id.toLowerCase().includes(search.trim().toLowerCase()));
  }, [runs, sourceFilter, search]);

  const emptyLabel = sourceFilter === "UI" ? "No UI run yet." : "No API run yet.";

  return (
    <div className="shrink-0 pt-4 sm:pt-6">
      <div className="overflow-hidden rounded-radius-xxl border border-boarder-tertiary bg-surface-main-background shadow-sm">
        <div className="flex flex-row flex-wrap items-center gap-space-03 border-b border-boarder-tertiary bg-surface-main-background-2 px-[21px] py-space-04">
          <Clock className="h-4 w-4 text-icon-primary" aria-hidden="true" />
          <h3 className="font-body text-[14px] font-semibold leading-5 text-text-primary">Run History</h3>
          <span className="text-small text-text-secondary">({filteredRuns.length})</span>

          <div className="ml-auto flex flex-wrap items-center gap-space-03">
            <div className="flex items-center gap-space-02 rounded-radius-xl border border-width-xs border-boarder-tertiary bg-surface-primary p-space-02">
              <button
                type="button"
                onClick={() => setSourceFilter("UI")}
                className={[
                  "flex h-7 w-[82px] items-center justify-center rounded-radius-l font-body text-[11px] font-medium leading-4 transition-colors",
                  sourceFilter === "UI"
                    ? "bg-surface-tertiary text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                UI Runs
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter("API")}
                className={[
                  "flex h-7 w-[82px] items-center justify-center rounded-radius-l font-body text-[11px] font-medium leading-4 transition-colors",
                  sourceFilter === "API"
                    ? "bg-surface-tertiary text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                API Runs
              </button>
            </div>

            <div className="relative">
              <Search
                className="absolute left-space-05 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-icon-tertiary"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Run ID..."
                className="h-10 w-full rounded-radius-xl border border-boarder-tertiary bg-surface-main-background-3 pl-[44px] pr-space-04 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[264px]"
              />
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-boarder-tertiary bg-surface-main-background">
                <th className="px-space-06 py-space-04 text-left font-medium text-text-secondary">Date &amp; Time</th>
                <th className="px-space-04 py-space-04 text-left font-medium text-text-secondary">Status</th>
                <th className="px-space-04 py-space-04 text-left font-medium text-text-secondary">Used credits</th>
                <th className="px-space-06 py-space-04 text-right font-medium text-text-secondary">Run ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr className="border-b">
                  <td
                    colSpan={4}
                    className="bg-surface-main-background px-space-06 py-[40px] text-center text-text-primary"
                  >
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="border-b border-boarder-tertiary transition-colors hover:bg-muted/30">
                    <td className="px-space-06 py-space-04 text-text-primary">
                      {formatRunDateTime(run.createdAt)}
                    </td>
                    <td className="px-space-04 py-space-04">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="px-space-04 py-space-04 text-text-secondary">
                      {run.actualCredits ?? run.estimatedCredits ?? "—"}
                    </td>
                    <td className="px-space-06 py-space-04 text-right font-mono text-xs text-text-secondary">
                      {shortRunId(run.id)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PlaygroundTab({ workflow }: { workflow: Workflow }) {
  const { clientFetch, clientEventsUrl } = useClientApi();
  const inputs = useMemo(() => extractPlaygroundInputs(workflow), [workflow]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    getPlaygroundInputValues(workflow, inputs),
  );
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [runCompletedTick, setRunCompletedTick] = useState(0);
  const creditEstimate = useMemo(() => estimatePlaygroundCredits(workflow), [workflow]);

  const waitForRunCompletion = useCallback(
    async (runId: string): Promise<RunWithNodes> => {
      const url = await clientEventsUrl(`/api/v1/runs/${runId}/events`);
      return new Promise((resolve, reject) => {
        const es = new EventSource(url);

        const cleanup = () => {
          es.close();
        };

        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data) as RunWithNodes;
            if (payload.run.id !== runId) return;

            if (payload.run.status === "SUCCESS") {
              cleanup();
              resolve(payload);
              return;
            }

            if (payload.run.status === "FAILED" || payload.run.status === "CANCELLED") {
              cleanup();
              reject(new Error(payload.run.errorSummary ?? "Workflow run failed."));
            }
          } catch {
            // ignore malformed events
          }
        };

        es.onerror = () => {
          cleanup();
          reject(new Error("Lost connection to run events."));
        };
      });
    },
    [clientEventsUrl],
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setOutput(null);

    try {
      const updated = applyPlaygroundInputsToGraph(workflow, values) as Workflow;

      if (workflow.type !== "SYSTEM") {
        await clientFetch(`/api/v1/workflows/${workflow.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nodes: updated.nodes,
            edges: updated.edges,
            expectedVersion: workflow.version,
          }),
        });
      }

      const res = await clientFetch(`/api/v1/workflows/${workflow.id}/runs`, {
        method: "POST",
        body: JSON.stringify(
          workflow.type === "SYSTEM"
            ? {
                targetNodeIds: [],
                graph: { nodes: updated.nodes, edges: updated.edges },
              }
            : { targetNodeIds: [] },
        ),
      });
      const json = (await res.json()) as { run: WorkflowRun };
      const result = await waitForRunCompletion(json.run.id);
      setOutput(extractOutputFromNodeRuns(result.nodeRuns));
      setRunCompletedTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start workflow run.");
    } finally {
      setRunning(false);
    }
  }, [workflow, values, clientFetch, waitForRunCompletion]);

  return (
    <div className="h-full">
      <div className="relative h-full overflow-y-auto p-4 sm:p-6 sm:pl-16">
        <div className="grid h-[72vh] grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[480px_1fr]">
          <div className="flex min-h-0 flex-col">
            <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Inputs</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Configure the input fields for this workflow run
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  Est. {creditEstimate}
                </span>
              </div>
              <div className="h-px w-full shrink-0 bg-border" />
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {inputs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No configurable inputs for this workflow.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {inputs.map((input) => (
                      <div key={input.id} className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground/70">
                            <AlignLeft className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <label className="text-[13px] font-medium text-foreground" htmlFor={input.id}>
                            {input.label}
                          </label>
                          <span className="ml-auto text-[11px] capitalize text-muted-foreground/50">
                            {input.type}
                          </span>
                        </div>
                        <textarea
                          id={input.id}
                          placeholder={input.placeholder}
                          rows={3}
                          value={values[input.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [input.id]: e.target.value }))
                          }
                          className="min-h-[60px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 bg-muted/30 px-5 py-4">
                <button
                  type="button"
                  onClick={() => void handleRun()}
                  disabled={running}
                  className="relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-indigo-600/90 px-4 py-2 text-base font-medium text-white shadow-lg transition-all before:absolute before:inset-0 before:translate-x-[-200%] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-1000 before:ease-in-out hover:bg-indigo-700 hover:shadow-xl hover:before:translate-x-[200%] disabled:pointer-events-none disabled:opacity-50"
                >
                  {running ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                  )}
                  {running ? "Running…" : "Run"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Output</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Results from workflow execution</p>
                </div>
              </div>
              <div className="h-px w-full shrink-0 bg-border" />
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : output != null ? (
                  renderOutput(output)
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                      <Play className="h-7 w-7 opacity-30" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/70">No output yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/50">
                      Run the workflow to see results here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <PlaygroundRunHistory workflowId={workflow.id} runCompletedTick={runCompletedTick} />
      </div>
    </div>
  );
}
