"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { section: "General", items: [
    { label: "Fit view", keys: ["F"] },
    { label: "Auto-arrange", keys: ["⇧", "A"] },
    { label: "Toggle pan / select", keys: ["S"] },
    { label: "Pan while holding", keys: ["Space", "drag"] },
    { label: "Select all", keys: ["⌘", "A"] },
    { label: "Deselect all", keys: ["Esc"] },
    { label: "Zoom in / out", keys: ["+", "−"] },
  ]},
  { section: "Node operations", items: [
    { label: "Copy", keys: ["⌘", "C"] },
    { label: "Paste", keys: ["⌘", "V"] },
    { label: "Duplicate", keys: ["⌘", "D"] },
    { label: "Duplicate with edges", keys: ["⌘", "⇧", "D"] },
    { label: "Delete", keys: ["Del"] },
    { label: "Undo", keys: ["⌘", "Z"] },
    { label: "Redo", keys: ["⌘", "⇧", "Z"] },
  ]},
];

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(49,49,49,0.55)] backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="mx-4 flex max-h-[min(90vh,640px)] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.22)] dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-zinc-700">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {SHORTCUTS.map((section) => (
            <div key={section.section} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{section.section}</h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-zinc-300">
                    <span>{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-1.5 font-mono text-xs shadow-[0_1px_0_0_#e0e0e2] dark:border-zinc-600 dark:bg-zinc-800"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
