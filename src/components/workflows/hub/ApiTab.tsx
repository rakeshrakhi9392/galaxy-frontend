"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import type { Workflow } from "@/lib/types";
import {
  API_CODE_LANGUAGES,
  type ApiCodeLanguage,
  buildApiCodeSample,
  getApiBaseUrl,
} from "@/lib/workflows/apiCodeSamples";
import { HighlightedCodeBlock } from "./HighlightedCodeBlock";

function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant: "neutral" | "success" | "error";
}) {
  const className =
    variant === "success"
      ? "bg-surface-success-disabled text-text-success-disabled"
      : variant === "error"
        ? "bg-surface-error-disabled text-text-error-disabled"
        : "bg-surface-disabled text-text-secondary";

  return (
    <span className={`rounded-radius-m px-space-03 text-small ${className}`}>{label}</span>
  );
}

function MethodBadge({ method }: { method: "POST" | "GET" }) {
  const className =
    method === "POST"
      ? "bg-surface-success-disabled text-text-success"
      : "bg-surface-information-disabled text-text-information-disabled";

  return (
    <span
      className={`shrink-0 rounded-radius-m px-space-02 py-space-01 font-body text-[11px] font-semibold leading-4 ${className}`}
    >
      {method}
    </span>
  );
}

function CodePanel({
  workflow,
  language,
  onLanguageChange,
}: {
  workflow: Workflow;
  language: ApiCodeLanguage;
  onLanguageChange: (lang: ApiCodeLanguage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const code = useMemo(
    () => buildApiCodeSample(language, workflow.id, workflow),
    [language, workflow.id, workflow],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [code]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const activeLabel = API_CODE_LANGUAGES.find((l) => l.id === language)?.label ?? "Python";

  const highlightLanguage =
    language === "javascript" ? "javascript" : language === "curl" ? "curl" : "python";

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-radius-xxl border border-width-s border-boarder-tertiary bg-surface-main-background-2">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-gray-200 bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:border-gray-700 dark:hover:bg-neutral-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {activeLabel}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-radius-xl border border-boarder-tertiary bg-surface-main-background-3 py-1 shadow-lg">
              {API_CODE_LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onLanguageChange(item.id);
                    setMenuOpen(false);
                  }}
                  className={[
                    "flex w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-primary",
                    item.id === language ? "text-text-primary" : "text-text-secondary",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-neutral-700"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <HighlightedCodeBlock code={code} language={highlightLanguage} />
      </div>
    </div>
  );
}

function DocsPanel({
  workflowId,
  inDetails,
  onInDetailsChange,
}: {
  workflowId: string;
  inDetails: boolean;
  onInDetailsChange: (value: boolean) => void;
}) {
  const baseUrl = getApiBaseUrl();
  const startEndpoint = `${baseUrl}/api/v1/workflows/${workflowId}/runs`;
  const pollEndpoint = `/api/v1/runs/{runId}`;

  const sampleStartResponse = `{
  "run": {
    "id": "run_abc123...",
    "workflowId": "${workflowId}",
    "status": "QUEUED"
  }
}`;

  const samplePollResponse = `{
  "run": {
    "id": "run_abc123...",
    "workflowId": "${workflowId}",
    "status": "SUCCESS",
    "startedAt": "2025-01-01T00:00:00.000Z",
    "finishedAt": "2025-01-01T00:00:12.000Z",
    "errorSummary": null,
    "estimatedCredits": 1,
    "actualCredits": 1
  }${
    inDetails
      ? `,
  "nodeRuns": [
    {
      "id": "nr_req123...",
      "nodeId": "llm_1",
      "nodeType": "llm",
      "status": "SUCCESS",
      "output": { "ok": true, "text": "stubbed: Hello" }
    },
    {
      "id": "nr_resp123...",
      "nodeId": "end",
      "nodeType": "output",
      "status": "SUCCESS",
      "output": { "ok": true, "value": { "ok": true, "text": "stubbed: Hello" } }
    }
  ]`
      : ""
  }
}`;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="space-y-space-05">
        <section>
          <h3 className="text-heading-sm mb-space-03 text-text-primary">API Endpoint</h3>
          <div className="flex items-center gap-space-04 rounded-radius-xl border border-width-xs border-boarder-tertiary bg-surface-main-background-2 p-space-04">
            <MethodBadge method="POST" />
            <code className="min-w-0 truncate font-mono text-[12px] leading-5 text-text-secondary">
              {startEndpoint}
            </code>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm mb-space-03 text-text-primary">Response Format</h3>
          <div className="space-y-space-04 rounded-radius-xl border border-width-xs border-boarder-tertiary bg-surface-main-background-2 p-space-04">
            <p className="text-body text-text-primary">
              The start endpoint returns a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">run.id</code>. Poll{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                GET {pollEndpoint}
              </code>{" "}
              to check status.
            </p>
            <div className="overflow-x-auto rounded-radius-l border border-width-xs border-boarder-tertiary bg-surface-main-background-3 px-space-04 py-space-03">
              <pre className="whitespace-pre font-mono text-[12px] leading-5 text-text-primary">
                {sampleStartResponse}
              </pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm mb-space-03 text-text-primary">Polling Format</h3>
          <div className="space-y-space-04 rounded-radius-xl border border-width-xs border-boarder-tertiary bg-surface-main-background-2 p-space-04">
            <p className="text-body text-text-primary">
              Poll{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                GET {pollEndpoint}
              </code>{" "}
              until status is a terminal value:
            </p>
            <div className="flex flex-wrap gap-space-02">
              <StatusPill label="Queued" variant="neutral" />
              <StatusPill label="Running" variant="neutral" />
              <StatusPill label="Success" variant="success" />
              <StatusPill label="Cancelled" variant="error" />
              <StatusPill label="Failed" variant="error" />
            </div>
            <div className="flex items-center gap-space-04 rounded-radius-xl border border-width-xs border-boarder-tertiary bg-surface-main-background-2 p-space-04">
              <MethodBadge method="GET" />
              <code className="min-w-0 truncate font-mono text-[12px] leading-5 text-text-secondary">
                {pollEndpoint}
                {inDetails ? " (includes nodeRuns)" : ""}
              </code>
            </div>
            <div className="flex items-center gap-space-04">
              <span className="text-body text-text-secondary">inDetails</span>
              <button
                type="button"
                role="switch"
                aria-checked={inDetails}
                onClick={() => onInDetailsChange(!inDetails)}
                className={[
                  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  inDetails ? "bg-primary" : "bg-input",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    inDetails ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
              <span className="text-caption text-text-secondary">
                {inDetails ? "true" : "false"} — {inDetails ? "all node runs" : "run summary only"}
              </span>
            </div>
            <p className="text-body text-text-secondary">Sample response:</p>
            <div className="overflow-x-auto rounded-radius-l border border-width-xs border-boarder-tertiary bg-surface-main-background-3 px-space-04 py-space-03">
              <pre className="whitespace-pre font-mono text-[12px] leading-5 text-text-primary">
                {samplePollResponse}
              </pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-heading-sm mb-space-03 text-text-primary">Webhooks (Optional)</h3>
          <p className="text-caption mb-space-03 text-text-primary">
            Add a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">webhook</code>{" "}
            object to receive notifications when the run completes.
          </p>
          <div className="overflow-x-auto rounded-radius-l border border-width-xs border-boarder-tertiary bg-surface-main-background-3 px-space-04 py-space-03">
            <pre className="whitespace-pre font-mono text-[12px] leading-5 text-text-primary">{`{
  "webhook": {
    "url": "https://your-server.com/webhook",
    "events": [
      "run.completed",
      "run.failed"
    ]
  }
}`}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ApiTab({ workflow }: { workflow: Workflow }) {
  const [language, setLanguage] = useState<ApiCodeLanguage>("python");
  const [inDetails, setInDetails] = useState(true);

  return (
    <div className="flex h-full w-full gap-space-07 overflow-hidden pb-space-07 pl-[60px] pr-[60px] pt-space-07">
      <CodePanel workflow={workflow} language={language} onLanguageChange={setLanguage} />
      <DocsPanel
        workflowId={workflow.id}
        inDetails={inDetails}
        onInDetailsChange={setInDetails}
      />
    </div>
  );
}
