"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { useWorkflowCanvasActions } from "../WorkflowCanvasActions";

const MENU_ITEM_CLASS =
  "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-[18px] px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground dark:hover:bg-neutral-700";

type MenuPosition = {
  top: number;
  left: number;
};

export function NodeActionsMenu({
  nodeId,
  locked = false,
  deletable = true,
}: {
  nodeId: string;
  locked?: boolean;
  deletable?: boolean;
}) {
  const actions = useWorkflowCanvasActions();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onViewportChange() {
      updatePosition();
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, updatePosition]);

  function closeAndRun(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => {
            if (!current) updatePosition();
            return !current;
          });
        }}
        className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              data-side="bottom"
              data-align="end"
              data-state="open"
              className="fixed z-[10050] min-w-[8rem] w-[200px] overflow-hidden rounded-[18px] border border-border/20 bg-popover p-1 text-popover-foreground shadow-lg"
              style={{
                top: position.top,
                left: position.left,
                transform: "translateX(-100%)",
              }}
            >
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={() => closeAndRun(() => actions?.duplicateNode(nodeId))}
              >
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={() => closeAndRun(() => actions?.duplicateNodeWithEdges(nodeId))}
              >
                Duplicate with Edges
              </button>
              <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted" />
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={() => closeAndRun(() => actions?.toggleLockNode(nodeId))}
              >
                {locked ? "Unlock" : "Lock"}
              </button>
              <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted" />
              {deletable ? (
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM_CLASS}
                  onClick={() => closeAndRun(() => actions?.deleteNode(nodeId))}
                >
                  Delete
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
