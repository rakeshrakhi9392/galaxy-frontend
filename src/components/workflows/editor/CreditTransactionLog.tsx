"use client";

import { useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import type { CreditTransaction } from "@/lib/types";
import {
  creditTxnAmountClass,
  creditTxnTypeLabel,
  formatCreditTxnAmount,
  formatCreditTxnDescription,
} from "@/lib/creditLedgerDisplay";

function formatTxnTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionRow({ txn }: { txn: CreditTransaction }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-gray-900 dark:text-zinc-100">
            {creditTxnTypeLabel(txn.type)}
          </div>
          <div className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
            {formatCreditTxnDescription(txn)}
          </div>
          <div className="mt-1 text-[10px] tabular-nums text-gray-500 dark:text-zinc-400">
            {formatTxnTime(txn.createdAt)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-[11px] font-semibold tabular-nums ${creditTxnAmountClass(txn.type)}`}
          >
            {formatCreditTxnAmount(txn)}
          </div>
          <div className="mt-0.5 text-[10px] tabular-nums text-gray-500 dark:text-zinc-400">
            Bal {txn.balanceAfter.toLocaleString("en-US")}
          </div>
        </div>
      </div>
    </li>
  );
}

export function CreditTransactionLog({
  open,
  onClose,
  transactions,
  loading,
  error,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  transactions: CreditTransaction[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="nopan nowheel pointer-events-auto absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(100vw-32px,360px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-zinc-700">
        <div>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
            Credit transactions
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-zinc-400">
            All balance changes for your account
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Refresh credit transactions"
            onClick={() => void onRefresh()}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Close credit transactions"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto p-3">
        {loading && transactions.length === 0 ? (
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">Loading transactions…</p>
        ) : error ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        ) : transactions.length === 0 ? (
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
