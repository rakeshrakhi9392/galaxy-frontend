import type { CreditTransaction } from "@/lib/types";

export function formatCreditTxnAmount(txn: CreditTransaction): string {
  const formatted = txn.amount.toLocaleString("en-US");
  if (txn.type === "RUN_CHARGE") return `-${formatted}`;
  if (txn.type === "GRANT" || txn.type === "RUN_REFUND") return `+${formatted}`;
  return formatted;
}

export function creditTxnTypeLabel(type: CreditTransaction["type"]): string {
  switch (type) {
    case "GRANT":
      return "Grant";
    case "RUN_CHARGE":
      return "Run charge";
    case "RUN_REFUND":
      return "Refund";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type;
  }
}

export function creditTxnAmountClass(type: CreditTransaction["type"]): string {
  if (type === "RUN_CHARGE") {
    return "text-red-600 dark:text-red-400";
  }
  if (type === "GRANT" || type === "RUN_REFUND") {
    return "text-emerald-700 dark:text-emerald-400";
  }
  return "text-gray-700 dark:text-zinc-200";
}

export function formatCreditTxnDescription(txn: CreditTransaction): string {
  const metadata =
    txn.metadata && typeof txn.metadata === "object" && !Array.isArray(txn.metadata)
      ? (txn.metadata as Record<string, unknown>)
      : null;

  if (txn.type === "GRANT") {
    return typeof metadata?.reason === "string" ? metadata.reason.replace(/_/g, " ") : "Credit grant";
  }

  if (txn.type === "RUN_CHARGE") {
    const nodeType = typeof metadata?.nodeType === "string" ? metadata.nodeType : null;
    return nodeType ? `Node run · ${nodeType}` : "Workflow node run";
  }

  if (txn.type === "RUN_REFUND") {
    return "Run refund";
  }

  return "Balance adjustment";
}
