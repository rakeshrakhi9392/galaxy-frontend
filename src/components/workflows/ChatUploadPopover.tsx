"use client";

import { ImagePlus, Plus } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const POPOVER_MAX_WIDTH = 246;
const POPOVER_GAP = 8;
const VIEWPORT_EDGE_PADDING = 16;
const ESTIMATED_POPOVER_HEIGHT = 160;

export type ChatUploadPopoverPosition = {
  left: number;
  top: number;
};

function getPopoverPosition(
  anchor: HTMLElement,
  popoverHeight = ESTIMATED_POPOVER_HEIGHT,
): ChatUploadPopoverPosition {
  const rect = anchor.getBoundingClientRect();
  const popoverWidth = Math.min(window.innerWidth * 0.8, POPOVER_MAX_WIDTH);
  const maxLeft = window.innerWidth - popoverWidth - VIEWPORT_EDGE_PADDING;

  const anchorNearRight = rect.right > window.innerWidth - popoverWidth / 2;
  let left = anchorNearRight ? rect.right - popoverWidth : rect.left;
  left = Math.max(VIEWPORT_EDGE_PADDING, Math.min(left, maxLeft));

  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
  const spaceAbove = rect.top - POPOVER_GAP;

  let top: number;
  if (spaceBelow >= popoverHeight) {
    top = rect.bottom + POPOVER_GAP;
  } else if (spaceAbove >= popoverHeight) {
    top = rect.top - popoverHeight - POPOVER_GAP;
  } else if (spaceBelow >= spaceAbove) {
    top = rect.bottom + POPOVER_GAP;
  } else {
    top = rect.top - popoverHeight - POPOVER_GAP;
  }

  top = Math.max(
    VIEWPORT_EDGE_PADDING,
    Math.min(top, window.innerHeight - popoverHeight - VIEWPORT_EDGE_PADDING),
  );

  return { left, top };
}

type UseChatUploadPopoverOptions = {
  ignoreRefs?: RefObject<HTMLElement | null>[];
};

export function useChatUploadPopover(
  anchorRef: RefObject<HTMLElement | null>,
  options?: UseChatUploadPopoverOptions,
) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ChatUploadPopoverPosition | null>(null);

  function updatePosition() {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const measuredHeight = popoverRef.current?.getBoundingClientRect().height;
    setPosition(getPopoverPosition(anchor, measuredHeight));
  }

  function openPopover() {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPosition(getPopoverPosition(anchor));
    setOpen(true);
  }

  function closePopover() {
    setOpen(false);
  }

  function togglePopover() {
    if (open) {
      closePopover();
      return;
    }
    openPopover();
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const ignored = [
        anchorRef.current,
        popoverRef.current,
        ...(options?.ignoreRefs?.map((ref) => ref.current) ?? []),
      ];
      if (ignored.some((element) => element?.contains(target))) return;
      closePopover();
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, anchorRef, options?.ignoreRefs]);

  return {
    open,
    position,
    popoverRef,
    openPopover,
    closePopover,
    togglePopover,
  };
}

type ChatUploadPopoverContentProps = {
  open: boolean;
  position: ChatUploadPopoverPosition | null;
  popoverRef: RefObject<HTMLDivElement | null>;
  onUploadFromDevice: () => void;
  onSelectAsset: () => void;
};

export function ChatUploadPopoverContent({
  open,
  position,
  popoverRef,
  onUploadFromDevice,
  onSelectAsset,
}: ChatUploadPopoverContentProps) {
  if (!open || !position) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="chat-upload-popover"
      role="dialog"
      aria-label="Upload options"
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
      }}
    >
      <p className="text-xs text-text-primary">
        Add a file from your device or select one from your library
      </p>
      <button
        type="button"
        className="chat-upload-popover-action chat-upload-popover-action-secondary"
        onClick={onSelectAsset}
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        Select Asset
      </button>
      <button
        type="button"
        className="chat-upload-popover-action chat-upload-popover-action-primary"
        onClick={onUploadFromDevice}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Upload
      </button>
    </div>,
    document.body,
  );
}
