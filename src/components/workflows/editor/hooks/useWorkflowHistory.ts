"use client";

import { useCallback, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { cloneGraph, type GraphSnapshot } from "@/lib/editor/graphUtils";

const MAX_HISTORY = 100;

export function useWorkflowHistory() {
  const [present, setPresent] = useState<GraphSnapshot | null>(null);
  const pastRef = useRef<GraphSnapshot[]>([]);
  const futureRef = useRef<GraphSnapshot[]>([]);
  const [, bump] = useState(0);

  const refresh = useCallback(() => bump((n) => n + 1), []);

  const init = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      const snapshot = cloneGraph({ nodes, edges });
      setPresent(snapshot);
      pastRef.current = [];
      futureRef.current = [];
      refresh();
    },
    [refresh],
  );

  const record = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (!present) {
        init(nodes, edges);
        return;
      }
      const next = cloneGraph({ nodes, edges });
      const prevJson = JSON.stringify(present);
      const nextJson = JSON.stringify(next);
      if (prevJson === nextJson) return;

      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), present];
      futureRef.current = [];
      setPresent(next);
      refresh();
    },
    [present, init, refresh],
  );

  const undo = useCallback((): GraphSnapshot | null => {
    if (pastRef.current.length === 0 || !present) return null;
    const previous = pastRef.current[pastRef.current.length - 1]!;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [present, ...futureRef.current];
    setPresent(previous);
    refresh();
    return cloneGraph(previous);
  }, [present, refresh]);

  const redo = useCallback((): GraphSnapshot | null => {
    if (futureRef.current.length === 0 || !present) return null;
    const next = futureRef.current[0]!;
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, present];
    setPresent(next);
    refresh();
    return cloneGraph(next);
  }, [present, refresh]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return { init, record, undo, redo, canUndo, canRedo };
}
