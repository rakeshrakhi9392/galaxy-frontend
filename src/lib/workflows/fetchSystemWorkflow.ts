import "server-only";

import { parseWorkflowDocument } from "@galaxy/schemas";
import { serverBackendFetch } from "@/lib/serverBackend";

/** Server-only: used by `?template=` redirect on `/workflows`. */
export async function fetchSystemWorkflowBySlug(slug: string) {
  const res = await serverBackendFetch(`/api/v1/system-workflows/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    return null;
  }
  return parseWorkflowDocument(await res.json());
}
