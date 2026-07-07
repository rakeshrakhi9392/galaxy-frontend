import type { ResponseFieldBinding } from "@galaxy/schemas";

export type ResponseResults = Record<string, unknown> | unknown[];

export function extractResponseResults(output: unknown): ResponseResults | undefined {
  if (output == null || typeof output !== "object") return undefined;
  const record = output as Record<string, unknown>;
  if (record.results != null && typeof record.results === "object") {
    return record.results as ResponseResults;
  }
  return record as ResponseResults;
}

export function resolveResponseFieldValue(
  results: ResponseResults | undefined,
  binding: ResponseFieldBinding,
  index: number,
): unknown {
  if (results == null) return undefined;
  if (Array.isArray(results)) return results[index];
  if (binding.name in results) return results[binding.name];
  return undefined;
}
