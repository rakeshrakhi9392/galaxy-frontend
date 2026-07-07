"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { acquireCanvasZoomLock, subscribeComboboxClose } from "../canvasZoomLock";

const NODE_COMBOBOX_MIN_WIDTH_PX = 120;
const NODE_COMBOBOX_ITEM_MIN_HEIGHT_CLASS = "min-h-10";

type NodeComboboxProps<T extends string | number> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
};

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
};

export function NodeCombobox<T extends string | number>({
  value,
  options,
  onChange,
  className = "",
  disabled = false,
}: NodeComboboxProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  function updatePosition() {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(rect.width, NODE_COMBOBOX_MIN_WIDTH_PX),
    });
  }

  function scrollList(direction: "up" | "down") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientHeight * 0.65, 32);
    el.scrollBy({ top: direction === "up" ? -amount : amount, behavior: "smooth" });
  }

  const releaseLockRef = useRef<(() => void) | null>(null);

  const closeCombobox = useCallback(() => {
    releaseLockRef.current?.();
    releaseLockRef.current = null;
    setOpen(false);
  }, []);

  const openCombobox = useCallback(() => {
    updatePosition();
    if (!releaseLockRef.current) {
      releaseLockRef.current = acquireCanvasZoomLock();
    }
    setOpen(true);
  }, []);

  function toggle() {
    if (disabled) return;
    if (open) {
      closeCombobox();
      return;
    }
    openCombobox();
  }

  useEffect(() => subscribeComboboxClose(closeCombobox), [closeCombobox]);

  useEffect(() => {
    return () => {
      releaseLockRef.current?.();
      releaseLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      closeCombobox();
    }
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [open, closeCombobox]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const selected = scrollRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
    requestAnimationFrame(updateScrollIndicators);
  }, [open, updateScrollIndicators]);

  const dropdown =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            className="nodrag nowheel fixed z-[9999] overflow-hidden rounded-[18px] border border-gray-200/80 bg-[#f6f6f6] shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
            onWheelCapture={(event) => event.stopPropagation()}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              minWidth: NODE_COMBOBOX_MIN_WIDTH_PX,
            }}
          >
            {canScrollUp ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => scrollList("up")}
                className="flex w-full items-center justify-center py-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronUp className="h-3.5 w-3.5 opacity-60" />
              </button>
            ) : null}

            <div
              ref={scrollRef}
              role="listbox"
              data-combobox-scroll
              onScroll={updateScrollIndicators}
              className="scrollbar-none max-h-[280px] overflow-y-auto px-1"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => {
                      onChange(option.value);
                      closeCombobox();
                    }}
                    className={`flex w-full cursor-pointer select-none items-center gap-2 rounded-[14px] px-3 py-2 text-sm text-gray-900 outline-none transition-colors hover:bg-gray-200/60 focus:bg-gray-200/60 dark:text-white dark:hover:bg-zinc-700 ${NODE_COMBOBOX_ITEM_MIN_HEIGHT_CLASS}`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {canScrollDown ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => scrollList("down")}
                className="flex w-full items-center justify-center py-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggle}
        className={[
          "nodrag nowheel flex h-10 w-full min-w-[120px] items-center justify-between rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white",
          className,
        ].join(" ")}
      >
        <span className="truncate" style={{ pointerEvents: "none" }}>
          {selectedOption?.label ?? String(value)}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>
      {dropdown}
    </>
  );
}
