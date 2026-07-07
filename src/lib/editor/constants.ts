export const CANVAS_BG = "#F4F4F4";
export const DOT_COLOR = "#CACACA";
export const DOT_GAP = 20;
export const SELECTION_COLOR = "#5D3FD3";
export const DEFAULT_ZOOM = 0.45;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.0;
export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: DEFAULT_ZOOM };
export const NODE_WIDTH = 380;
export const HISTORY_PANEL_DEFAULT_WIDTH = 360;
export const HISTORY_PANEL_MIN_WIDTH = 320;
export const AUTOSAVE_DEBOUNCE_MS = 1000;
export const CHROME_INSET = 24;
export const CHROME_EDGE = 16;
export const MINIMAP_TOGGLE_RIGHT = 75;

/** Full canvas editor minimap (`/workflows/[id]/canvas`). */
export const CANVAS_MINIMAP_WIDTH = 200;
export const CANVAS_MINIMAP_HEIGHT = 150;
export const CANVAS_MINIMAP_MASK_COLOR = "rgba(0, 0, 0, 0.8)";
export const CANVAS_MINIMAP_BACKGROUND_COLOR = "#18181b";

/** Workflow hub preview minimap (`/workflows/[id]?tab=workflow`). */
export const PREVIEW_MINIMAP_WIDTH = 140;
export const PREVIEW_MINIMAP_HEIGHT = 100;
export const PREVIEW_MINIMAP_MASK_COLOR = "rgba(0, 0, 0, 0.15)";
export const PREVIEW_MINIMAP_NODE_COLOR = "#a78bfa";
export const PREVIEW_MINIMAP_BACKGROUND_COLOR = "#000000";

export const NODE_ACCENT_COLORS: Record<string, string> = {
  request: "#3b82f6",
  llm: "#22c55e",
  "gpt-image-2": "#14b8a6",
  "kling-v3-pro": "#6366f1",
  response: "#eab308",
  default: "#444444",
};
