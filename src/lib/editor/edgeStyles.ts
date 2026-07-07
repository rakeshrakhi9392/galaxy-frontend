export function getReceiverEdgeStroke(targetType: string | undefined, targetHandle?: string | null): string {
  if (targetType === "response") return "#8b5cf6";
  if (targetType === "llm") {
    if (targetHandle === "in:prompt") return "#f59e0b";
    return "#4f46e6";
  }
  if (targetType === "request") return "#6366f1";
  return "#4f46e6";
}
