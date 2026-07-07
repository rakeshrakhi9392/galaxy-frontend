"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Workflow } from "@/lib/types";
import {
  WORKFLOW_HUB_TABS,
  type WorkflowHubTab,
  workflowHubHref,
} from "@/lib/workflows/tabs";
import { PlaygroundTab } from "./PlaygroundTab";
import { ApiTab } from "./ApiTab";
import { WorkflowTab } from "./WorkflowTab";

const TAB_LABELS: Record<WorkflowHubTab, string> = {
  playground: "Playground",
  api: "API",
  workflow: "Workflow",
};

export function WorkflowHubClient({
  workflow,
  hubSegment,
  initialTab,
}: {
  workflow: Workflow;
  hubSegment: string;
  initialTab: WorkflowHubTab;
}) {
  const router = useRouter();
  const activeTab = initialTab;

  const setTab = (tab: WorkflowHubTab) => {
    router.push(workflowHubHref(hubSegment, tab));
  };

  return (
    <div className="workflow-editor-layout relative flex h-screen min-w-0 flex-1 overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface-main-background">
        <div className="w-full shrink-0">
          <div className="w-full pb-space-03 pl-[60px] pr-[60px] pt-space-08">
            <div className="flex items-center gap-space-05">
              <Link
                href="/workflows"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-l bg-surface-primary text-icon-primary transition-colors hover:bg-surface-secondary"
                title="Back to Flow"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <h1 className="truncate text-workflow-hub-title-google text-text-primary">{workflow.name}</h1>
            </div>
          </div>

          <div className="w-full border-b border-boarder-tertiary pl-[60px] pr-[60px] pt-space-03">
            <div className="flex items-center gap-space-07">
              {WORKFLOW_HUB_TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTab(tab)}
                    className={[
                      "-mb-px flex h-[34px] items-center border-b-2 bg-transparent py-1 transition-colors duration-150",
                      isActive
                        ? "border-boarder-primary text-workflow-hub-tab-active-google text-text-primary"
                        : "border-b-[rgba(224,224,226,0.624)] text-workflow-hub-tab-inactive-google",
                    ].join(" ")}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={
            activeTab === "workflow" ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-auto"
          }
        >
          {activeTab === "playground" ? <PlaygroundTab workflow={workflow} /> : null}
          {activeTab === "api" ? <ApiTab workflow={workflow} /> : null}
          {activeTab === "workflow" ? (
            <div className="flex h-full min-h-0 flex-col">
              <WorkflowTab workflow={workflow} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
