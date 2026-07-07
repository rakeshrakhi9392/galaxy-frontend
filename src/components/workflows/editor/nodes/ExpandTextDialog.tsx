"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ExpandTextDialogProps = {
  open: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  maxLength?: number;
  placeholder?: string;
};

export function ExpandTextDialog({
  open,
  title,
  value,
  onChange,
  onClose,
  maxLength,
  placeholder,
}: ExpandTextDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="nodrag nopan nowheel fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative grid w-full max-h-[90vh] max-w-lg gap-4 overflow-y-auto border border-border bg-background p-6 shadow-lg sm:max-w-2xl sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 id={titleId} className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h2>
        </div>
        <textarea
          autoFocus
          rows={12}
          value={value}
          onChange={(e) => {
            const next = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
            onChange(next);
          }}
          placeholder={placeholder}
          className="nodrag nowheel min-h-[200px] w-full resize-y rounded-lg border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
