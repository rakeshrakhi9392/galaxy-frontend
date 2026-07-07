"use client";

import {
  ChevronLeft,
  ChevronRight,
  Command,
  LayoutGrid,
  Maximize2,
  Move,
  Redo2,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ToolbarTooltip } from "./ToolbarTooltip";

type CanvasToolbarProps = {
  collapsed: boolean;
  zoomPct: number;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
  canvasMode: "pan" | "select";
  onToggleCollapse: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoArrange: () => void;
  onToggleMode: () => void;
  onOpenShortcuts: () => void;
};

export function CanvasToolbar({
  collapsed,
  zoomPct,
  canUndo,
  canRedo,
  disabled,
  canvasMode,
  onToggleCollapse,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoArrange,
  onToggleMode,
  onOpenShortcuts,
}: CanvasToolbarProps) {
  return (
    <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-xl border border-gray-200 bg-white/95 px-1 py-1 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 md:gap-1 md:px-2 md:py-1.5">
      <ToolbarTooltip label="Collapse toolbar">
        <button
          type="button"
          aria-label="Collapse toolbar"
          onClick={onToggleCollapse}
          className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </ToolbarTooltip>

      {!collapsed ? (
        <>
          <div className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <ToolbarTooltip label="Undo" kbd="⌘Z">
            <button
              type="button"
              aria-label="Undo"
              disabled={!canUndo || disabled}
              onClick={onUndo}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <ToolbarTooltip label="Redo" kbd="⌘⇧Z">
            <button
              type="button"
              aria-label="Redo"
              disabled={!canRedo || disabled}
              onClick={onRedo}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <ToolbarTooltip label="Keyboard shortcuts">
            <button
              type="button"
              aria-label="Keyboard shortcuts"
              onClick={onOpenShortcuts}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Command className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <div className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <ToolbarTooltip label="Zoom out">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={disabled}
              onClick={onZoomOut}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <span className="min-w-[36px] text-center text-xs font-medium tabular-nums text-gray-500 md:min-w-[44px]">
            {zoomPct}%
          </span>

          <ToolbarTooltip label="Zoom in">
            <button
              type="button"
              aria-label="Zoom in"
              disabled={disabled}
              onClick={onZoomIn}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <div className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <ToolbarTooltip label="Fit view" kbd="F">
            <button
              type="button"
              aria-label="Fit view"
              disabled={disabled}
              onClick={onFitView}
              className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <ToolbarTooltip label="Auto-arrange" kbd="⇧A">
            <button
              type="button"
              aria-label="Auto-arrange"
              disabled={disabled}
              onClick={onAutoArrange}
              className="hidden rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 md:inline-flex dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </ToolbarTooltip>

          <ToolbarTooltip label={canvasMode === "pan" ? "Select mode" : "Pan mode"} kbd="S">
            <button
              type="button"
              aria-label={canvasMode === "pan" ? "Select mode" : "Pan mode"}
              aria-pressed={canvasMode === "select"}
              disabled={disabled}
              onClick={onToggleMode}
              className={[
                "rounded-lg p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:hover:bg-zinc-800",
                canvasMode === "select"
                  ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200",
              ].join(" ")}
            >
              {canvasMode === "pan" ? <Move className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            </button>
          </ToolbarTooltip>
        </>
      ) : null}
    </div>
  );
}
