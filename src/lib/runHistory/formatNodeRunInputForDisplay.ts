import { remapRequestFieldKeys } from "./requestFieldLabels";

const MAX_INLINE_STRING = 2000;

export type FormatNodeRunIoOptions = {
  requestFieldLabels?: Record<string, string>;
};

/**
 * Formats a node-run input/output payload for the Execution History panel.
 * Keeps large strings readable without dumping unbounded content into the DOM.
 */
export function formatNodeRunInputForDisplay(
  input: unknown,
  options?: FormatNodeRunIoOptions,
): string {
  const payload =
    options?.requestFieldLabels != null
      ? remapRequestFieldKeys(input, options.requestFieldLabels)
      : input;

  if (payload == null) return "No inputs recorded.";

  if (typeof payload === "string") {
    if (payload.length === 0) return "(empty string)";
    if (payload.length <= MAX_INLINE_STRING) return payload;
    return `${payload.slice(0, MAX_INLINE_STRING)}… (${payload.length} chars total)`;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (typeof payload === "object") {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return Array.isArray(payload) ? String(payload) : "[object]";
    }
  }

  return String(payload);
}
