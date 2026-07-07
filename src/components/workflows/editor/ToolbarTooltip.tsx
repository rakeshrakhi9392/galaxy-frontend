import type { ReactNode } from "react";

type ToolbarTooltipProps = {
  label: string;
  kbd?: string;
  placement?: "top" | "bottom";
  align?: "center" | "start" | "end";
  children: ReactNode;
};

function horizontalAlignClass(align: "center" | "start" | "end"): string {
  if (align === "start") return "left-0";
  if (align === "end") return "right-0";
  return "left-1/2 -translate-x-1/2";
}

export function ToolbarTooltip({
  label,
  kbd,
  placement = "top",
  align = "center",
  children,
}: ToolbarTooltipProps) {
  const horizontalClass = horizontalAlignClass(align);
  const placementClass =
    placement === "bottom"
      ? `top-full mt-2 ${horizontalClass}`
      : `bottom-full mb-2 ${horizontalClass}`;

  return (
    <div className="group relative">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${placementClass}`}
      >
        <span>{label}</span>
        {kbd ? (
          <kbd className="ml-1.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded border border-gray-600 bg-gray-800 px-1 font-mono text-[10px]">
            {kbd}
          </kbd>
        ) : null}
      </div>
    </div>
  );
}
