import "server-only";

import { redirect } from "next/navigation";
import { parseWorkflowDocument } from "@galaxy/schemas";
import { serverBackendFetch } from "@/lib/serverBackend";
import type { Workflow } from "@/lib/types";
import { fetchSystemWorkflowBySlug } from "./fetchSystemWorkflow";
import { isSystemWorkflowSlug } from "./tabs";

export async function loadWorkflowPage(id: string): Promise<Workflow> {
  let workflowRes: Response;
  try {
    workflowRes = await serverBackendFetch(`/api/v1/workflows/${id}`);
  } catch {
    redirect("/workflows");
  }

  if (!workflowRes.ok) {
    redirect("/workflows");
  }

  return parseWorkflowDocument(await workflowRes.json());
}

/** Resolves hub routes by system slug (e.g. ai-racing-car) or user workflow id. */
export async function loadWorkflowHubPage(param: string): Promise<Workflow> {
  if (isSystemWorkflowSlug(param)) {
    const system = await fetchSystemWorkflowBySlug(param);
    if (system) {
      return system;
    }
    redirect("/workflows");
  }

  return loadWorkflowPage(param);
}

export async function forkWorkflow(id: string): Promise<string> {
  const res = await serverBackendFetch(`/api/v1/workflows/${id}`);
  if (!res.ok) {
    throw new Error("Failed to load workflow");
  }

  const workflow = parseWorkflowDocument(await res.json());
  const createRes = await serverBackendFetch("/api/v1/workflows", {
    method: "POST",
    body: JSON.stringify({
      name: `${workflow.name} Copy`,
      graph: {
        nodes: workflow.nodes,
        edges: workflow.edges,
        ...(workflow.viewport ? { viewport: workflow.viewport } : {}),
      },
      thumbnailUrl: workflow.thumbnailUrl ?? null,
    }),
  });

  if (!createRes.ok) {
    throw new Error("Failed to fork workflow");
  }

  const created = parseWorkflowDocument(await createRes.json());
  return created.id;
}
