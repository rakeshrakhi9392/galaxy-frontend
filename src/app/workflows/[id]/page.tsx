import { redirect } from "next/navigation";
import { loadWorkflowHubPage } from "@/lib/workflows/loadWorkflowPage";
import { parseWorkflowHubTab, workflowHubHref, workflowHubSegment } from "@/lib/workflows/tabs";
import { WorkflowHubClient } from "@/components/workflows/hub/WorkflowHubClient";

export default async function WorkflowHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id: routeParam } = await params;
  const { tab } = await searchParams;
  const initialTab = parseWorkflowHubTab(tab);
  const workflow = await loadWorkflowHubPage(routeParam);

  const hubSegment = workflowHubSegment(workflow);
  if (routeParam !== hubSegment) {
    redirect(workflowHubHref(hubSegment, initialTab));
  }

  return (
    <WorkflowHubClient
      workflow={workflow}
      hubSegment={hubSegment}
      initialTab={initialTab}
    />
  );
}
