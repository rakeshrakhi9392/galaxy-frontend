import { formatCreditEstimate } from "@galaxy/schemas";
import { getNodeDefinition } from "@/generated/nodeRegistry";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function defaultInputsForType(nodeType: string): Record<string, unknown> {
  const def = getNodeDefinition(nodeType);
  return asRecord(asRecord(def?.ui.defaults).inputs);
}

/** Live credit estimate for one node (registry estimator, then static pricing fallback). */
export function estimateNodeCredits(
  nodeType: string,
  inputs: Record<string, unknown> = {},
): number {
  const merged = { ...defaultInputsForType(nodeType), ...inputs };
  const def = getNodeDefinition(nodeType);
  if (!def) return 0;

  if (def.estimateCredits) {
    return def.estimateCredits(merged);
  }

  return def.ui.pricing?.estimateCredits ?? 0;
}

export function resolveNodeInputsFromData(data: unknown): Record<string, unknown> {
  return asRecord(asRecord(data).inputs);
}

/** Sum per-node estimates for a workflow graph. */
export function estimateWorkflowCredits(
  nodes: Array<{ type?: string; data?: unknown }>,
): number {
  return nodes.reduce((total, node) => {
    const nodeType = node.type ?? "";
    if (!nodeType) return total;
    return total + estimateNodeCredits(nodeType, resolveNodeInputsFromData(node.data));
  }, 0);
}

export function formatWorkflowCreditEstimate(credits: number): string {
  if (credits <= 0) return formatCreditEstimate(0);
  return formatCreditEstimate(credits);
}

/** Split credits for canvas chrome badges (Est / Bal display). */
export function formatChromeCreditParts(credits: number): { value: string; unit: string } {
  if (credits >= 1_000_000) {
    return { value: (credits / 1_000_000).toFixed(2), unit: "M" };
  }
  if (credits >= 1_000) {
    return { value: (credits / 1_000).toFixed(0), unit: "K" };
  }
  if (credits <= 0) {
    return { value: "0.00", unit: "M" };
  }
  return { value: (credits / 1_000_000).toFixed(2), unit: "M" };
}
