"use client";

import { useCallback, useState } from "react";
import { HISTORY_PANEL_DEFAULT_WIDTH } from "@/lib/editor/constants";

export function useEditorUI() {
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyPanelWidth, setHistoryPanelWidth] = useState(HISTORY_PANEL_DEFAULT_WIDTH);
  const [canvasLocked, setCanvasLocked] = useState(false);

  const toggleHistoryPanel = useCallback(() => {
    setHistoryPanelOpen((open) => !open);
  }, []);

  const lockCanvas = useCallback(() => setCanvasLocked(true), []);
  const unlockCanvas = useCallback(() => setCanvasLocked(false), []);

  return {
    historyPanelOpen,
    setHistoryPanelOpen,
    historyPanelWidth,
    setHistoryPanelWidth,
    toggleHistoryPanel,
    canvasLocked,
    lockCanvas,
    unlockCanvas,
  };
}
