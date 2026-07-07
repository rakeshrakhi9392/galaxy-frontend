"use client";

type ConnectionDragTooltipProps = {
  x: number;
  y: number;
  message: string;
};

/** Cursor-following tooltip shown while dragging an invalid connection. */
export function ConnectionDragTooltip({ x, y, message }: ConnectionDragTooltipProps) {
  return (
    <div
      role="tooltip"
      aria-live="polite"
      className="pointer-events-none fixed z-[200] max-w-[min(18rem,calc(100vw-2rem))] rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium leading-relaxed text-white shadow-lg"
      style={{ left: x + 14, top: y + 14 }}
    >
      {message}
    </div>
  );
}
