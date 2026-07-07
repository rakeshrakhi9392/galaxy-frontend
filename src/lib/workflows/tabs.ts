import type { Workflow } from "@/lib/types";

export const WORKFLOW_HUB_TABS = ["playground", "api", "workflow"] as const;

export type WorkflowHubTab = (typeof WORKFLOW_HUB_TABS)[number];

const SYSTEM_SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

export function isSystemWorkflowSlug(param: string): boolean {
  return SYSTEM_SLUG_PATTERN.test(param);
}

export function workflowHubSegment(workflow: Workflow): string {
  if (workflow.type === "SYSTEM" && workflow.slug) {
    return workflow.slug;
  }
  return workflow.id;
}

export function parseWorkflowHubTab(value: string | undefined): WorkflowHubTab {
  if (value && WORKFLOW_HUB_TABS.includes(value as WorkflowHubTab)) {
    return value as WorkflowHubTab;
  }
  return "playground";
}

export function workflowHubHref(
  hubSegmentOrWorkflow: string | Workflow,
  tab: WorkflowHubTab = "playground",
) {
  const segment =
    typeof hubSegmentOrWorkflow === "string"
      ? hubSegmentOrWorkflow
      : workflowHubSegment(hubSegmentOrWorkflow);
  return `/workflows/${segment}?tab=${tab}`;
}

export function workflowCanvasHref(workflowId: string) {
  return `/workflows/${workflowId}/canvas`;
}
