"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Copy,
  Download,
  EllipsisVertical,
  ExternalLink,
  ImagePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { duplicateWorkflowAction, renameWorkflowAction } from "@/app/workflows/actions";
import type { WorkflowListItem } from "@/lib/types";
import { EditedTime } from "@/components/ClientRelativeTime";
import { readWorkflowThumbnailFile } from "@/lib/workflowThumbnails";
import { DEFAULT_WORKFLOW_THUMBNAIL } from "@/lib/workflowDefaults";
import { fetchJsonWithEtag, invalidateHttpCache } from "@/lib/httpCache";
import { useClientApi } from "@/lib/useClientApi";
import { parseWorkflowDocument } from "@galaxy/schemas";
import {
  ChatUploadPopoverContent,
  useChatUploadPopover,
} from "@/components/workflows/ChatUploadPopover";
import { DeleteWorkflowDialog } from "@/components/workflows/DeleteWorkflowDialog";
import { WorkflowActionLoader } from "@/components/workflows/WorkflowActionLoader";

const menuItemClassName =
  "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-[18px] px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground dark:hover:bg-neutral-700";

export function WorkflowCard({
  workflow,
  onDeleted,
  onThumbnailUpdated,
  onRenamed,
}: {
  workflow: WorkflowListItem;
  onDeleted?: (id: string) => void;
  onThumbnailUpdated?: (id: string, thumbnailUrl: string | null) => void;
  onRenamed?: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const { clientFetch, clientRequest } = useClientApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(workflow.name);
  const [displayName, setDisplayName] = useState(workflow.name);
  const {
    open: uploadPopoverOpen,
    position: uploadPopoverPosition,
    popoverRef: uploadPopoverRef,
    togglePopover: toggleUploadPopover,
    closePopover: closeUploadPopover,
  } = useChatUploadPopover(thumbnailButtonRef, {
    ignoreRefs: [menuButtonRef, menuRef],
  });
  const [thumbnailUrl, setThumbnailUrl] = useState(
    workflow.thumbnailUrl ?? DEFAULT_WORKFLOW_THUMBNAIL,
  );
  const [pending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [savingThumbnail, setSavingThumbnail] = useState(false);

  useEffect(() => {
    setThumbnailUrl(workflow.thumbnailUrl ?? DEFAULT_WORKFLOW_THUMBNAIL);
  }, [workflow.id, workflow.thumbnailUrl]);

  useEffect(() => {
    setDisplayName(workflow.name);
    if (!isRenaming) {
      setDraftName(workflow.name);
    }
  }, [workflow.id, workflow.name, isRenaming]);

  useEffect(() => {
    if (!isRenaming) return;
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [isRenaming]);

  useEffect(() => {
    if (!menuOpen && !uploadPopoverOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !menuButtonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen, uploadPopoverOpen]);

  async function persistThumbnail(nextThumbnailUrl: string | null) {
    setSavingThumbnail(true);
    try {
      const res = await clientFetch(`/api/v1/workflows/${workflow.id}`, {
        method: "PATCH",
        body: JSON.stringify({ thumbnailUrl: nextThumbnailUrl }),
      });
      if (!res.ok) {
        throw new Error("Failed to update thumbnail");
      }
      invalidateHttpCache("/api/v1/workflows");
      invalidateHttpCache(`/api/v1/workflows/${workflow.id}`);
      setThumbnailUrl(nextThumbnailUrl ?? DEFAULT_WORKFLOW_THUMBNAIL);
      onThumbnailUpdated?.(workflow.id, nextThumbnailUrl);
    } catch {
      window.alert("Failed to update workflow thumbnail");
    } finally {
      setSavingThumbnail(false);
    }
  }

  async function handleThumbnailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readWorkflowThumbnailFile(file);
    await persistThumbnail(dataUrl);
    event.target.value = "";
  }

  function handleUploadFromDevice() {
    closeUploadPopover();
    fileInputRef.current?.click();
  }

  async function handleSelectAsset() {
    closeUploadPopover();
    await persistThumbnail(DEFAULT_WORKFLOW_THUMBNAIL);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleOpenWorkflow(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    closeMenu();
    setOpening(true);
  }

  function handleRename() {
    closeMenu();
    setDraftName(displayName);
    setIsRenaming(true);
  }

  function cancelRename() {
    setDraftName(displayName);
    setIsRenaming(false);
  }

  function commitRename() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }

    if (trimmed === displayName) {
      setIsRenaming(false);
      return;
    }

    const previousName = displayName;
    setDisplayName(trimmed);
    setIsRenaming(false);

    startTransition(async () => {
      try {
        await renameWorkflowAction(workflow.id, trimmed);
        invalidateHttpCache("/api/v1/workflows");
        invalidateHttpCache(`/api/v1/workflows/${workflow.id}`);
        onRenamed?.(workflow.id, trimmed);
      } catch {
        setDisplayName(previousName);
        window.alert("Failed to rename workflow");
      }
    });
  }

  async function handleDuplicate() {
    closeMenu();
    setDuplicating(true);
    try {
      await duplicateWorkflowAction(workflow.id);
      invalidateHttpCache("/api/v1/workflows");
      router.refresh();
    } catch {
      window.alert("Failed to duplicate workflow");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleExportJson() {
    closeMenu();
    try {
      const json = await fetchJsonWithEtag(
        `/api/v1/workflows/${workflow.id}`,
        parseWorkflowDocument,
        clientRequest,
      );
      const blob = new Blob(
        [JSON.stringify({ name: json.name, nodes: json.nodes, edges: json.edges }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${json.name.replace(/[^\w.-]+/g, "_") || "workflow"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Failed to export workflow");
    }
  }

  function openDeleteDialog() {
    closeMenu();
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteDialogOpen(false);
  }

  async function confirmDelete() {
    setDeleteDialogOpen(false);
    setDeleting(true);
    try {
      await clientFetch(`/api/v1/workflows/${workflow.id}`, { method: "DELETE" });
      invalidateHttpCache("/api/v1/workflows");
      invalidateHttpCache(`/api/v1/workflows/${workflow.id}`);
      onDeleted?.(workflow.id);
      router.refresh();
    } catch {
      window.alert("Failed to delete workflow");
    } finally {
      setDeleting(false);
    }
  }

  const isDataUrl = thumbnailUrl.startsWith("data:");

  return (
    <div className="group/card relative max-w-[250px]">
      <div className="relative overflow-hidden rounded-xl border border-border shadow-sm transition-colors hover:border-primary/30">
        <Link
          href={`/workflows/${workflow.id}`}
          onClick={handleOpenWorkflow}
          className="block aspect-[250/162] bg-surface-main-background-3 dark:bg-card"
        >
          <Image
            src={thumbnailUrl}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={isDataUrl}
          />
        </Link>
      </div>

      <div className="absolute left-2 top-2 z-10">
        <div className="relative">
          <button
            ref={thumbnailButtonRef}
            type="button"
            onClick={() => {
              setMenuOpen(false);
              toggleUploadPopover();
            }}
            aria-label={`Change thumbnail for ${displayName}`}
            aria-haspopup="dialog"
            aria-expanded={uploadPopoverOpen}
            data-state={uploadPopoverOpen ? "open" : "closed"}
            className="rounded-md bg-white/80 p-1 text-muted-foreground opacity-0 transition-all group-hover/card:opacity-100 hover:bg-white hover:text-foreground focus:opacity-100 data-[state=open]:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/50 dark:hover:bg-black/70"
          >
            <ImagePlus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        hidden
        accept="image/*"
        type="file"
        onChange={handleThumbnailChange}
      />

      <div className="absolute right-2 top-2 z-10">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={`Actions for ${displayName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-state={menuOpen ? "open" : "closed"}
          onClick={() => {
            closeUploadPopover();
            setMenuOpen((open) => !open);
          }}
          disabled={pending || deleting || duplicating}
          className="rounded-md bg-white/80 p-1 text-muted-foreground opacity-0 transition-all group-hover/card:opacity-100 hover:bg-white hover:text-foreground focus:opacity-100 data-[state=open]:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/50 dark:hover:bg-black/70"
        >
          <EllipsisVertical size={16} aria-hidden="true" />
        </button>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute right-2 top-10 z-20 w-40 min-w-[8rem] overflow-hidden rounded-[18px] border border-border/20 bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <Link
            role="menuitem"
            href={`/workflows/${workflow.id}`}
            className={menuItemClassName}
            onClick={handleOpenWorkflow}
          >
            <ExternalLink size={14} className="mr-2 shrink-0" aria-hidden="true" />
            Open
          </Link>
          <button
            type="button"
            role="menuitem"
            className={menuItemClassName}
            disabled={pending}
            onClick={handleRename}
          >
            <Pencil size={14} className="mr-2 shrink-0" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClassName}
            disabled={pending || duplicating}
            onClick={() => void handleDuplicate()}
          >
            <Copy size={14} className="mr-2 shrink-0" aria-hidden="true" />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClassName}
            disabled={pending}
            onClick={handleExportJson}
          >
            <Download size={14} className="mr-2 shrink-0" aria-hidden="true" />
            Export JSON
          </button>
          <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted" />
          <button
            type="button"
            role="menuitem"
            className={`${menuItemClassName} text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400`}
            disabled={pending || deleting}
            onClick={openDeleteDialog}
          >
            <Trash2 size={14} className="mr-2 shrink-0" aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : null}

      <ChatUploadPopoverContent
        open={uploadPopoverOpen}
        position={uploadPopoverPosition}
        popoverRef={uploadPopoverRef}
        onUploadFromDevice={handleUploadFromDevice}
        onSelectAsset={() => void handleSelectAsset()}
      />

      <DeleteWorkflowDialog
        open={deleteDialogOpen}
        workflowName={displayName}
        deleting={deleting}
        onCancel={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />

      {deleting ? <WorkflowActionLoader message="Deleting workflow..." /> : null}
      {opening ? <WorkflowActionLoader message="Opening workflow..." /> : null}
      {duplicating ? <WorkflowActionLoader message="Duplicating workflow..." /> : null}

      <div className="mt-2 px-1">
        {isRenaming ? (
          <input
            ref={nameInputRef}
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                commitRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelRename();
              }
            }}
            aria-label="Workflow name"
            className="w-full truncate rounded border border-boarder-secondary bg-background px-1 py-0 text-sm font-medium text-foreground outline-none ring-1 ring-primary/20 focus:border-boarder-primary focus:ring-primary/30"
          />
        ) : (
          <div className="truncate text-workflow-card-name-google" title={displayName}>
            {displayName}
          </div>
        )}
        <EditedTime
          date={workflow.updatedAt}
          className="mt-0.5 block text-xs text-muted-foreground"
        />
      </div>
    </div>
  );
}
