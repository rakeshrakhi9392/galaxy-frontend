import { WorkflowsPageClient } from "@/components/workflows/WorkflowsPageClient";
import { createFromTemplate, createWorkflow, importWorkflowAction } from "./actions";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  if (params.template) {
    await createFromTemplate(params.template);
  }

  return (
    <WorkflowsPageClient
      createWorkflowAction={createWorkflow}
      importWorkflowAction={importWorkflowAction}
    />
  );
}
