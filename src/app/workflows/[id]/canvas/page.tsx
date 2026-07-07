import { redirect } from "next/navigation";
import { loadWorkflowHubPage } from "@/lib/workflows/loadWorkflowPage";
import { workflowHubHref, workflowHubSegment } from "@/lib/workflows/tabs";
import { WorkflowEditorClient } from "@/components/workflows/WorkflowEditorClient";

export default async function WorkflowCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: routeParam } = await params;
  const workflow = await loadWorkflowHubPage(routeParam);

  if (workflow.type === "SYSTEM") {
    redirect(workflowHubHref(workflowHubSegment(workflow), "workflow"));
  }

  return (
    <div className="workflow-editor-layout relative flex min-h-0 flex-1 overflow-hidden">
      <div className="workflow-canvas h-full w-full overflow-hidden bg-surface-main-background-2 dark:bg-galaxy-surface-main">
        <WorkflowEditorClient workflow={workflow} />
      </div>
    </div>
  );
}
