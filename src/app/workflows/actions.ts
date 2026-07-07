"use server";

import { parseWorkflowDocument } from "@galaxy/schemas";
import { serverBackendFetch } from "@/lib/serverBackend";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchSystemWorkflowBySlug } from "@/lib/workflows/fetchSystemWorkflow";

async function createWorkflowFromPayload(payload: {
  name: string;
  nodes?: unknown[];
  edges?: unknown[];
  graph?: unknown;
}): Promise<string> {
  const res = await serverBackendFetch("/api/v1/workflows", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to create workflow");
  }

  const json = parseWorkflowDocument(await res.json());
  return json.id;
}

export async function createWorkflow() {
  const id = await createWorkflowFromPayload({
    name: "Untitled workflow",
    nodes: [],
    edges: [],
  });
  redirect(`/workflows/${id}`);
}

export async function importWorkflowAction(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing workflow file");
  }

  const text = await file.text();
  const parsed = JSON.parse(text) as {
    name?: string;
    nodes?: unknown[];
    edges?: unknown[];
    graph?: { nodes?: unknown[]; edges?: unknown[] };
  };

  const nodes = parsed.nodes ?? parsed.graph?.nodes;
  const edges = parsed.edges ?? parsed.graph?.edges;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error("Invalid workflow JSON");
  }

  return createWorkflowFromPayload({
    name: parsed.name?.trim() || file.name.replace(/\.json$/i, "") || "Imported workflow",
    nodes,
    edges,
  });
}

export async function createFromTemplate(templateSlug: string) {
  const template = await fetchSystemWorkflowBySlug(templateSlug);
  if (!template) {
    redirect("/workflows");
  }

  redirect(`/workflows/${template.slug}`);
}

export async function forkWorkflowAction(id: string): Promise<string> {
  const { forkWorkflow } = await import("@/lib/workflows/loadWorkflowPage");
  return forkWorkflow(id);
}

export async function renameWorkflowAction(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Workflow name is required");
  }

  const res = await serverBackendFetch(`/api/v1/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: trimmed }),
  });

  if (!res.ok) {
    throw new Error("Failed to rename workflow");
  }

  revalidatePath("/workflows");
}

export async function duplicateWorkflowAction(id: string) {
  const res = await serverBackendFetch(`/api/v1/workflows/${id}`);
  if (!res.ok) {
    throw new Error("Failed to load workflow");
  }

  const workflow = parseWorkflowDocument(await res.json());
  const createRes = await serverBackendFetch("/api/v1/workflows", {
    method: "POST",
    body: JSON.stringify({
      name: `${workflow.name} Copy`,
      nodes: workflow.nodes,
      edges: workflow.edges,
      thumbnailUrl: workflow.thumbnailUrl ?? null,
    }),
  });

  if (!createRes.ok) {
    throw new Error("Failed to duplicate workflow");
  }

  revalidatePath("/workflows");
}

export async function deleteWorkflowAction(id: string) {
  const res = await serverBackendFetch(`/api/v1/workflows/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete workflow");
  }

  revalidatePath("/workflows");
}
