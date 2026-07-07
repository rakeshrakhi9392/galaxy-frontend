"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { ExpandTextDialog } from "./ExpandTextDialog";

const DEFAULT_TEXTAREA_CLASS =
  "nodrag nowheel w-full resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 text-sm text-gray-900 outline-none focus:border-workflow-accent-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

type ExpandableTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function ExpandableTextarea({
  value,
  onChange,
  title,
  placeholder,
  rows = 3,
  maxLength,
  showCharCount = false,
  className = DEFAULT_TEXTAREA_CLASS,
  disabled = false,
  readOnly = false,
}: ExpandableTextareaProps) {
  const [expanded, setExpanded] = useState(false);
  const locked = disabled || readOnly;

  function handleChange(next: string) {
    if (locked) return;
    onChange(maxLength ? next.slice(0, maxLength) : next);
  }

  return (
    <>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          readOnly={locked}
          disabled={disabled}
          className={className}
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="Expand"
          className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700 dark:bg-zinc-700/80 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-white"
        >
          <Maximize2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      {showCharCount && maxLength ? (
        <div className="mt-1 text-right text-[10px] tabular-nums text-gray-400 dark:text-zinc-500">
          {value.length}/{maxLength}
        </div>
      ) : null}
      <ExpandTextDialog
        open={expanded}
        title={title}
        value={value}
        onChange={handleChange}
        onClose={() => setExpanded(false)}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </>
  );
}
