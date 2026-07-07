"use client";

import { useCallback, useEffect, useState } from "react";
import { useClientApi } from "@/lib/useClientApi";

export function useCreditBalance(options?: { refreshKey?: number }) {
  const { clientFetch } = useClientApi();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await clientFetch("/api/v1/account", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { creditBalance: number };
      setCreditBalance(json.creditBalance);
    } catch {
      // Keep last known balance on transient errors.
    } finally {
      setLoading(false);
    }
  }, [clientFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh, options?.refreshKey]);

  return { creditBalance, loading, refresh };
}
