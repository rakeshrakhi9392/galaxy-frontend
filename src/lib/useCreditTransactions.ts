"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreditTransaction } from "@/lib/types";
import { useClientApi } from "@/lib/useClientApi";

type CreditTransactionsResponse = {
  transactions: CreditTransaction[];
  nextCursor: string | null;
};

export function useCreditTransactions(options?: { refreshKey?: number; enabled?: boolean }) {
  const { clientFetch } = useClientApi();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (options?.enabled === false) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/v1/credits/transactions?limit=50", {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Could not load credit transactions.");
        return;
      }
      const json = (await res.json()) as CreditTransactionsResponse;
      setTransactions(json.transactions);
    } catch {
      setError("Could not load credit transactions.");
    } finally {
      setLoading(false);
    }
  }, [clientFetch, options?.enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh, options?.refreshKey]);

  return { transactions, loading, error, refresh };
}
