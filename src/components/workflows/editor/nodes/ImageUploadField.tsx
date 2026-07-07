"use client";

import { Info, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  ChatUploadPopoverContent,
  useChatUploadPopover,
} from "@/components/workflows/ChatUploadPopover";
import { useClientApi } from "@/lib/useClientApi";
import { uploadMediaFile, uploadMediaFiles } from "@/lib/uploads/api";

const DEFAULT_IMAGE_TOOLTIP =
  "PNG, JPEG, or WebP up to 20MB. Max resolution 3840px.";
const DEFAULT_VIDEO_TOOLTIP = "MP4, WebM, or MOV up to 500MB.";
const DEFAULT_AUDIO_TOOLTIP = "MP3, WAV, AAC, or other audio up to 50MB.";

type ImageUploadFieldBaseProps = {
  disabled?: boolean;
  /** Blocks adding/replacing files; defaults to `disabled` when omitted. */
  uploadDisabled?: boolean;
  /** When set, controls remove/reorder per item (e.g. wired URLs stay locked). */
  canRemoveItem?: (url: string, index: number) => boolean;
  helpText?: string;
  helpTooltip?: string;
  onSelectAsset?: () => void;
  accept?: string;
  buttonLabel?: string;
  /** When true, preview is rendered by the parent field layout instead. */
  hidePreview?: boolean;
};

type SingleImagePreviewProps = {
  url: string;
  disabled?: boolean;
  onRemove: () => void;
};

export function SingleImagePreview({
  url,
  disabled = false,
  onRemove,
}: SingleImagePreviewProps) {
  if (!url.length) return null;

  return (
    <div className="mt-2 flex justify-end">
      <div className="flex flex-col items-end gap-1">
        <div
          className="relative overflow-hidden rounded-md"
          style={{ border: "2px solid rgba(59, 130, 246, 0.3)" }}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url.split("#")[0]}
              alt=""
              className="block rounded-sm"
              style={{ maxWidth: 240, maxHeight: 160 }}
            />
            {!disabled ? (
              <button
                type="button"
                onClick={onRemove}
                className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                aria-label="Remove image"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type SingleVideoPreviewProps = {
  url: string;
  disabled?: boolean;
  onRemove: () => void;
};

export function SingleVideoPreview({
  url,
  disabled = false,
  onRemove,
}: SingleVideoPreviewProps) {
  if (!url.length) return null;

  return (
    <div className="mt-2">
      <div
        className="relative max-w-[160px] overflow-hidden rounded-md"
        style={{ border: "2px solid rgba(34, 197, 94, 0.3)" }}
      >
        <div className="nodrag nopan">
          <video
            src={url.split("#")[0]}
            controls
            className="w-full rounded-sm"
            style={{ maxHeight: 120 }}
          />
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={onRemove}
            className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
            aria-label="Remove video"
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

type SingleAudioPreviewProps = {
  url: string;
  disabled?: boolean;
  onRemove: () => void;
};

export function SingleAudioPreview({
  url,
  disabled = false,
  onRemove,
}: SingleAudioPreviewProps) {
  if (!url.length) return null;

  return (
    <div className="mt-2">
      <div
        className="relative max-w-full overflow-hidden rounded-md px-1 py-1"
        style={{ border: "2px solid rgba(6, 182, 212, 0.3)" }}
      >
        <div className="nodrag nopan">
          <audio src={url.split("#")[0]} controls className="h-8 w-full min-w-[200px]" />
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={onRemove}
            className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
            aria-label="Remove audio"
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

type SingleImageUploadFieldProps = ImageUploadFieldBaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type MultiImageUploadFieldProps = ImageUploadFieldBaseProps & {
  multiple: true;
  values: string[];
  onChange: (values: string[]) => void;
  /** Maximum number of items in a multi-value list (e.g. merge-video allows 20). */
  maxItems?: number;
};

export type ImageUploadFieldProps =
  | SingleImageUploadFieldProps
  | MultiImageUploadFieldProps;

function defaultButtonLabel(accept: string): string {
  if (accept.startsWith("video")) return "Upload video";
  if (accept.includes("audio")) return "Upload audio";
  return "Upload image";
}

function defaultHelpTooltip(accept: string): string {
  if (accept.startsWith("video")) return DEFAULT_VIDEO_TOOLTIP;
  if (accept.includes("audio")) return DEFAULT_AUDIO_TOOLTIP;
  return DEFAULT_IMAGE_TOOLTIP;
}

function VideoAddTile({
  disabled,
  uploading,
  accept,
  multiple,
  onFiles,
  onSelectAsset,
}: {
  disabled?: boolean;
  uploading?: boolean;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  onSelectAsset?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { open, position, popoverRef, closePopover, togglePopover } =
    useChatUploadPopover(triggerRef);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!files.length || disabled) return;
    await onFiles(files);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || uploading}
        onClick={togglePopover}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="nodrag relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] text-[10px] font-medium text-gray-400 hover:border-workflow-accent-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500"
        title="Add video"
        style={{ aspectRatio: "4 / 3" }}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          "Add Video"
        )}
      </button>

      <ChatUploadPopoverContent
        open={open}
        position={position}
        popoverRef={popoverRef}
        onUploadFromDevice={() => {
          fileInputRef.current?.click();
          closePopover();
        }}
        onSelectAsset={() => {
          closePopover();
          onSelectAsset?.();
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />
    </div>
  );
}

export function ImageUploadField(props: ImageUploadFieldProps) {
  const {
    disabled = false,
    uploadDisabled: uploadDisabledProp,
    canRemoveItem,
    helpText,
    onSelectAsset,
    accept = "image/*",
    buttonLabel = defaultButtonLabel(accept),
    helpTooltip = defaultHelpTooltip(accept),
    hidePreview = false,
  } = props;

  const uploadDisabled = uploadDisabledProp ?? disabled;

  function itemRemovable(url: string, index: number): boolean {
    if (canRemoveItem) return canRemoveItem(url, index);
    return !disabled;
  }

  const { clientFetch } = useClientApi();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { open, position, popoverRef, closePopover, togglePopover } =
    useChatUploadPopover(triggerRef);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const isMultiple = props.multiple === true;
  const maxItems = isMultiple ? props.maxItems : undefined;
  const singleValue = !isMultiple ? props.value : "";
  const multiValues = isMultiple ? props.values : [];
  const multiValuesRef = useRef(multiValues);
  multiValuesRef.current = multiValues;
  const hasValue = isMultiple ? multiValues.length > 0 : singleValue.length > 0;
  const isVideo = accept.startsWith("video");
  const isAudio = accept.includes("audio") && !isVideo;
  const mediaKind = isVideo ? "video" : isAudio ? "audio" : "image";

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleUploadFromDevice() {
    openFilePicker();
    closePopover();
  }

  function handleSelectAsset() {
    closePopover();
    if (onSelectAsset) {
      onSelectAsset();
      return;
    }
    if (isMultiple) return;
    const pasted = window.prompt("Paste a public https:// URL for this file");
    const trimmed = pasted?.trim() ?? "";
    if (trimmed.startsWith("https://")) {
      props.onChange(trimmed);
      setError(null);
      return;
    }
    if (trimmed.length > 0) {
      setError("URL must start with https://");
    }
  }

  function reorderVideos(from: number, to: number) {
    if (from === to || !isMultiple) return;
    const next = [...multiValuesRef.current];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    props.onChange(next);
  }

  function removeVideoAt(index: number) {
    if (!isMultiple) return;
    props.onChange(multiValuesRef.current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function appendUploadedFiles(files: File[]) {
    if (!files.length || uploadDisabled) return;

    setError(null);
    setUploading(true);
    try {
      if (isMultiple) {
        const uploaded = await uploadMediaFiles(files, clientFetch);
        const remaining =
          maxItems != null
            ? Math.max(0, maxItems - multiValuesRef.current.length)
            : uploaded.length;
        const nextUrls = uploaded.slice(0, remaining).map((item) => item.url);
        props.onChange([...multiValuesRef.current, ...nextUrls]);
        return;
      }

      const hosted = await uploadMediaFile(files[0]!, clientFetch);
      if (!hosted.url) {
        throw new Error("Upload succeeded but no URL was returned");
      }
      props.onChange(hosted.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    await appendUploadedFiles(files);
  }

  const displayButtonLabel =
    hasValue && !uploadDisabled && !isMultiple
      ? `Change ${mediaKind}`
      : buttonLabel;

  const showSingleImagePreview =
    !hidePreview &&
    !isMultiple &&
    !isVideo &&
    !isAudio &&
    hasValue &&
    singleValue.length > 0;

  const showSingleVideoPreview =
    !hidePreview && !isMultiple && isVideo && hasValue && singleValue.length > 0;

  const showSingleAudioPreview =
    !hidePreview && !isMultiple && isAudio && hasValue && singleValue.length > 0;

  return (
    <div>
      <div className="relative">
        {isMultiple && !isVideo && !isAudio && hasValue && !uploadDisabled ? (
          <div className="mb-2 grid grid-cols-2 gap-2">
            {multiValues.map((url) => (
              <div
                key={url}
                className="overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url.split("#")[0]} alt="" className="h-20 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          tabIndex={-1}
          disabled={uploading || uploadDisabled}
          onClick={togglePopover}
          aria-label={displayButtonLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={displayButtonLabel}
          className={[
            "nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs capitalize transition-colors disabled:opacity-50",
            uploadDisabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
              : "border-gray-300 bg-surface-main-background-3 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white",
          ].join(" ")}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{displayButtonLabel}</span>
        </button>

        <ChatUploadPopoverContent
          open={open}
          position={position}
          popoverRef={popoverRef}
          onUploadFromDevice={handleUploadFromDevice}
          onSelectAsset={handleSelectAsset}
        />

        {isVideo && isMultiple && multiValues.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {multiValues.map((url, index) => (
              <div
                key={`${url}-${index}`}
                draggable={itemRemovable(url, index)}
                onDragStart={(event) => {
                  event.stopPropagation();
                  setDragIndex(index);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) reorderVideos(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={[
                  "nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black dark:border-zinc-700",
                  dragIndex === index ? "opacity-40" : "",
                ].join(" ")}
                title={`Video ${index + 1}`}
                style={{ aspectRatio: "4 / 3" }}
              >
                <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {index + 1}
                </div>
                <video
                  src={url.split("#")[0]}
                  className="h-full w-full object-cover"
                  playsInline
                  preload="metadata"
                />
                {itemRemovable(url, index) ? (
                  <button
                    type="button"
                    onClick={() => removeVideoAt(index)}
                    className="nodrag absolute right-1 top-1 z-10 rounded bg-black/60 p-1 text-white hover:bg-red-500"
                    title="Remove"
                    aria-label={`Remove video ${index + 1}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))}

            {!uploadDisabled && (maxItems == null || multiValues.length < maxItems) ? (
              <VideoAddTile
                disabled={uploadDisabled}
                uploading={uploading}
                accept={accept}
                multiple={isMultiple}
                onSelectAsset={handleSelectAsset}
                onFiles={appendUploadedFiles}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {helpText ? (
        <div className="mt-1 flex items-center gap-1">
          <span className="group/tip relative inline-flex cursor-help">
            <Info
              className="h-3 w-3 text-gray-400 dark:text-zinc-500"
              aria-hidden="true"
            />
            {helpTooltip ? (
              <div className="pointer-events-none absolute bottom-full left-0 z-[9999] mb-1.5 hidden w-max max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
                {helpTooltip}
              </div>
            ) : null}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500">{helpText}</span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-1 text-[10px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={isMultiple}
        hidden
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />

      {showSingleImagePreview ? (
        <SingleImagePreview
          url={singleValue}
          disabled={disabled}
          onRemove={() => props.onChange("")}
        />
      ) : null}

      {showSingleVideoPreview ? (
        <SingleVideoPreview
          url={singleValue}
          disabled={disabled}
          onRemove={() => props.onChange("")}
        />
      ) : null}

      {showSingleAudioPreview ? (
        <SingleAudioPreview
          url={singleValue}
          disabled={disabled}
          onRemove={() => props.onChange("")}
        />
      ) : null}
    </div>
  );
}
