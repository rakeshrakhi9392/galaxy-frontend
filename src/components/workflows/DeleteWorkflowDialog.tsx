"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type DeleteWorkflowDialogProps = {
  open: boolean;
  workflowName: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const cancelButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-gray-200 bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:hover:bg-neutral-700 mt-2 sm:mt-0";

const deleteButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] bg-red-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:bg-red-600 dark:text-white dark:hover:bg-red-700";

export function DeleteWorkflowDialog({
  open,
  workflowName,
  deleting = false,
  onCancel,
  onConfirm,
}: DeleteWorkflowDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        event.stopPropagation();
        onCancel();
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, deleting, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        data-state="open"
        className="fixed inset-0 z-50 bg-black/80 pointer-events-auto"
        aria-hidden="true"
        onClick={deleting ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-state="open"
        className="pointer-events-auto fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-[18px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h2 id={titleId} className="text-lg font-semibold">
            Delete Workflow
          </h2>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{workflowName}&quot;? This action cannot be undone.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <button
            type="button"
            className={cancelButtonClassName}
            disabled={deleting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={deleteButtonClassName}
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
