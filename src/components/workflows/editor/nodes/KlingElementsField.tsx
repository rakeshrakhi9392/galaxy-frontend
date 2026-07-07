"use client";

import { Handle, Position, useReactFlow } from "reactflow";
import { Info, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  ChatUploadPopoverContent,
  useChatUploadPopover,
} from "@/components/workflows/ChatUploadPopover";
import { useClientApi } from "@/lib/useClientApi";
import { uploadMediaFile, uploadMediaFiles } from "@/lib/uploads/api";
import { useWiredField } from "@/lib/editor/useWiredField";
import { displayTextValue, mergeDisplayUrls } from "@/lib/editor/wiredFields";

const KLING_V3_PRO_MAX_ELEMENTS = 3;

const BLUE_HANDLE =
  "!h-3 !w-3 !border-2 !border-blue-500/50 !bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.31)]";
const GREEN_HANDLE =
  "!h-3 !w-3 !border-2 !border-green-500/50 !bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.31)]";

const UPLOAD_REQUIREMENTS = "Upload requirements";

export type KlingElementValue = {
  frontal_image_url?: string;
  reference_image_urls?: string[];
  video_url?: string;
};

function emptyElement(): KlingElementValue {
  return {
    frontal_image_url: "",
    reference_image_urls: [],
    video_url: "",
  };
}

function normalizeElements(value: unknown): KlingElementValue[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, KLING_V3_PRO_MAX_ELEMENTS).map((item) => {
    const record =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    return {
      frontal_image_url:
        typeof record.frontal_image_url === "string" ? record.frontal_image_url : "",
      reference_image_urls: Array.isArray(record.reference_image_urls)
        ? record.reference_image_urls.filter((url): url is string => typeof url === "string")
        : [],
      video_url: typeof record.video_url === "string" ? record.video_url : "",
    };
  });
}

function ElementsHeader({
  label,
  helpTooltip,
}: {
  label: string;
  helpTooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-600 dark:text-zinc-300">{label}</span>
      {helpTooltip ? (
        <span className="group/tip relative cursor-help">
          <Info className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-full left-0 z-[9999] mb-1.5 hidden w-max max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
            {helpTooltip}
          </div>
        </span>
      ) : null}
    </div>
  );
}

function UploadRequirementsHint() {
  return (
    <div className="mt-1 flex items-center gap-1">
      <span className="group/tip relative inline-flex cursor-help">
        <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-full left-0 z-[9999] mb-1.5 hidden w-max max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
          PNG, JPEG, or WebP up to 10MB. Max resolution 1920px.
        </div>
      </span>
      <span className="text-[10px] text-gray-400 dark:text-zinc-500">{UPLOAD_REQUIREMENTS}</span>
    </div>
  );
}

function ElementHandle({
  handleId,
  className,
}: {
  handleId: string;
  className: string;
}) {
  return (
    <div
      className="absolute flex items-center"
      style={{ left: -35, top: 14, transform: "translateY(-50%)", zIndex: 50 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        className={`${className} !relative !transform-none nodrag nopan`}
      />
    </div>
  );
}

function ElementUploadButton({
  accept,
  buttonLabel,
  hasValue,
  disabled,
  multiple,
  onFiles,
}: {
  accept: string;
  buttonLabel: string;
  hasValue: boolean;
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { open, position, popoverRef, closePopover, togglePopover } =
    useChatUploadPopover(triggerRef);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!files.length || disabled) return;

    setError(null);
    setUploading(true);
    try {
      await onFiles(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const label =
    hasValue && !disabled
      ? `Change ${buttonLabel.replace(/^Upload /i, "").toLowerCase()}`
      : buttonLabel;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        tabIndex={-1}
        disabled={uploading || disabled}
        onClick={togglePopover}
        title={label}
        className={[
          "nodrag flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs capitalize transition-colors disabled:opacity-50",
          disabled
            ? "cursor-not-allowed border-gray-300 bg-surface-main-background-3 text-gray-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            : "border-gray-300 bg-surface-main-background-3 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white",
        ].join(" ")}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>

      <ChatUploadPopoverContent
        open={open}
        position={position}
        popoverRef={popoverRef}
        onUploadFromDevice={() => {
          closePopover();
          fileInputRef.current?.click();
        }}
        onSelectAsset={closePopover}
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

      {error ? (
        <p className="mt-1 text-[10px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ElementFrontalImageSection({
  nodeId,
  index,
  value,
  onChange,
}: {
  nodeId: string;
  index: number;
  value: string;
  onChange: (next: string) => void;
}) {
  const handleId = `in:elements.${index}.frontal_image_url`;
  const wired = useWiredField(nodeId, handleId);
  const display = displayTextValue(wired.connected, wired.text, value);
  const hasPreview = display.trim().length > 0;
  const { clientFetch } = useClientApi();

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <ElementHandle handleId={handleId} className={BLUE_HANDLE} />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs text-gray-500 dark:text-zinc-400">
            Frontal Image<span className="text-red-400">*</span>
          </span>
          <div className="min-w-0 flex-1">
            <ElementUploadButton
              accept="image/*"
              buttonLabel="Upload image"
              hasValue={hasPreview}
              disabled={wired.connected}
              onFiles={async (files) => {
                const hosted = await uploadMediaFile(files[0]!, clientFetch);
                onChange(hosted.url);
              }}
            />
          </div>
        </div>

        {hasPreview ? (
          <div className="flex justify-end">
            <div className="flex flex-col items-end gap-1">
              <div
                className="relative overflow-hidden rounded-md"
                style={{ border: "2px solid rgba(59, 130, 246, 0.3)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src={display.split("#")[0]}
                  className="block rounded-sm"
                  style={{ maxWidth: 200, maxHeight: 120 }}
                />
                {!wired.connected ? (
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                    aria-label="Remove frontal image"
                  >
                    <X className="h-2.5 w-2.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReferenceAddImageTile({
  disabled,
  onFiles,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { open, position, popoverRef, closePopover, togglePopover } =
    useChatUploadPopover(triggerRef);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!files.length || disabled) return;

    setUploading(true);
    try {
      await onFiles(files);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={uploading || disabled}
        onClick={togglePopover}
        className="nodrag relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#F5F5F5] text-[10px] font-medium text-gray-400 hover:border-workflow-accent-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500"
        title="Add image"
        style={{ aspectRatio: "1 / 1" }}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          "Add Image"
        )}
      </button>

      <ChatUploadPopoverContent
        open={open}
        position={position}
        popoverRef={popoverRef}
        onUploadFromDevice={() => {
          closePopover();
          fileInputRef.current?.click();
        }}
        onSelectAsset={closePopover}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void handleFileChange(event);
        }}
      />
    </div>
  );
}

function ElementReferenceImagesSection({
  nodeId,
  index,
  values,
  frontalReady,
  onChange,
}: {
  nodeId: string;
  index: number;
  values: string[];
  frontalReady: boolean;
  onChange: (next: string[]) => void;
}) {
  const handleId = `in:elements.${index}.reference_image_urls`;
  const wired = useWiredField(nodeId, handleId);
  const { displayUrls, wiredSet } = mergeDisplayUrls(wired.urls, values);
  const { clientFetch } = useClientApi();
  const uploadEnabled = frontalReady && !wired.connected;
  const hasReferenceImages = displayUrls.length > 0;

  async function handleAddFiles(files: File[]) {
    const uploaded = await uploadMediaFiles(files, clientFetch);
    onChange([...values, ...uploaded.map((item) => item.url)]);
  }

  function removeAt(url: string) {
    if (wiredSet.has(url)) return;
    onChange(values.filter((item) => item !== url));
  }

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      {frontalReady ? <ElementHandle handleId={handleId} className={BLUE_HANDLE} /> : null}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-zinc-400">
          Reference Images
          {frontalReady ? <span className="text-red-400">*</span> : null}
        </span>
      </div>

      <ElementUploadButton
        accept="image/*"
        buttonLabel="Upload image"
        hasValue={false}
        disabled={!uploadEnabled}
        multiple
        onFiles={handleAddFiles}
      />

      <UploadRequirementsHint />

      {frontalReady && hasReferenceImages ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {displayUrls.map((url, imageIndex) => (
            <div
              key={`${url}-${imageIndex}`}
              className="nodrag nopan relative overflow-hidden rounded-lg border border-gray-200 bg-black dark:border-zinc-700"
              title={`Image ${imageIndex + 1}`}
              style={{ aspectRatio: "1 / 1" }}
            >
              <div className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {imageIndex + 1}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src={url.split("#")[0]}
                className="h-full w-full object-cover"
                draggable={false}
              />
              {uploadEnabled && !wiredSet.has(url) ? (
                <button
                  type="button"
                  onClick={() => removeAt(url)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-500 disabled:opacity-50"
                  title="Remove"
                  aria-label={`Remove reference image ${imageIndex + 1}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}

          {uploadEnabled ? (
            <ReferenceAddImageTile onFiles={handleAddFiles} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ElementVideoSection({
  nodeId,
  index,
  value,
  onChange,
}: {
  nodeId: string;
  index: number;
  value: string;
  onChange: (next: string) => void;
}) {
  const handleId = `in:elements.${index}.video_url`;
  const wired = useWiredField(nodeId, handleId);
  const display = displayTextValue(wired.connected, wired.text, value);
  const hasPreview = display.trim().length > 0;
  const { clientFetch } = useClientApi();

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <ElementHandle handleId={handleId} className={GREEN_HANDLE} />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs text-gray-500 dark:text-zinc-400">
            Video Element<span className="text-red-400">*</span>
          </span>
          <div className="min-w-0 flex-1">
            <ElementUploadButton
              accept="video/*"
              buttonLabel="Upload video"
              hasValue={hasPreview}
              disabled={wired.connected}
              onFiles={async (files) => {
                const hosted = await uploadMediaFile(files[0]!, clientFetch);
                onChange(hosted.url);
              }}
            />
            <UploadRequirementsHint />
          </div>
        </div>

        {hasPreview ? (
          <div>
            <div
              className="relative max-w-[160px] overflow-hidden rounded-md"
              style={{ border: "2px solid rgba(34, 197, 94, 0.3)" }}
            >
              <div className="nodrag nopan">
                <video
                  src={display.split("#")[0]}
                  controls
                  className="w-full rounded-sm"
                  style={{ maxHeight: 100 }}
                />
              </div>
              {!wired.connected ? (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white hover:bg-red-500"
                  aria-label="Remove video"
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KlingElementCard({
  nodeId,
  index,
  element,
  onChange,
  onRemove,
  onClearReferenceEdges,
}: {
  nodeId: string;
  index: number;
  element: KlingElementValue;
  onChange: (next: KlingElementValue) => void;
  onRemove: () => void;
  onClearReferenceEdges: (index: number) => void;
}) {
  const frontalHandleId = `in:elements.${index}.frontal_image_url`;
  const videoHandleId = `in:elements.${index}.video_url`;
  const frontalWired = useWiredField(nodeId, frontalHandleId);
  const videoWired = useWiredField(nodeId, videoHandleId);

  const frontalDisplay = displayTextValue(
    frontalWired.connected,
    frontalWired.text,
    element.frontal_image_url ?? "",
  );
  const videoDisplay = displayTextValue(
    videoWired.connected,
    videoWired.text,
    element.video_url ?? "",
  );

  const hasFrontal = frontalDisplay.trim().length > 0;
  const isVideoMode = videoDisplay.trim().length > 0 || videoWired.connected;

  function setFrontalImage(frontal_image_url: string) {
    if (!frontal_image_url.trim()) {
      onClearReferenceEdges(index);
      onChange({
        frontal_image_url: "",
        reference_image_urls: [],
        video_url: element.video_url ?? "",
      });
      return;
    }

    onChange({
      frontal_image_url,
      reference_image_urls: element.reference_image_urls ?? [],
      video_url: "",
    });
  }

  function setReferenceImages(reference_image_urls: string[]) {
    onChange({
      ...element,
      reference_image_urls,
      video_url: "",
    });
  }

  function setVideoUrl(video_url: string) {
    onChange({
      frontal_image_url: "",
      reference_image_urls: [],
      video_url,
    });
  }

  return (
    <div className="relative space-y-2.5 rounded-lg border border-gray-200 bg-[#F5F5F5]/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
      {isVideoMode ? (
        <ElementVideoSection
          nodeId={nodeId}
          index={index}
          value={element.video_url ?? ""}
          onChange={setVideoUrl}
        />
      ) : (
        <>
          <ElementFrontalImageSection
            nodeId={nodeId}
            index={index}
            value={element.frontal_image_url ?? ""}
            onChange={setFrontalImage}
          />

          <ElementReferenceImagesSection
            nodeId={nodeId}
            index={index}
            values={element.reference_image_urls ?? []}
            frontalReady={hasFrontal}
            onChange={setReferenceImages}
          />

          {!hasFrontal ? (
            <ElementVideoSection
              nodeId={nodeId}
              index={index}
              value={element.video_url ?? ""}
              onChange={setVideoUrl}
            />
          ) : null}
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        title="Remove item"
        aria-label={`Remove element ${index + 1}`}
        className="nodrag absolute -right-2 -top-2 rounded-full bg-gray-200 p-1 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-red-900/40 dark:hover:text-red-400"
      >
        <Trash2 className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

type KlingElementsFieldProps = {
  nodeId: string;
  label: string;
  helpTooltip?: string;
  value: unknown;
  onChange: (next: KlingElementValue[]) => void;
};

/** Config-driven editor for Kling v3 Pro `elements` (dynamic per-index handles). */
export function KlingElementsField({
  nodeId,
  label,
  helpTooltip,
  value,
  onChange,
}: KlingElementsFieldProps) {
  const { setEdges } = useReactFlow();
  const elements = normalizeElements(value);

  function clearReferenceEdges(index: number) {
    const handleId = `in:elements.${index}.reference_image_urls`;
    setEdges((edges) =>
      edges.filter(
        (edge) => !(edge.target === nodeId && (edge.targetHandle ?? "") === handleId),
      ),
    );
  }

  function removeElement(index: number) {
    onChange(elements.filter((_, i) => i !== index));
    setEdges((edges) =>
      edges
        .filter((edge) => {
          if (edge.target !== nodeId) return true;
          const handle = edge.targetHandle ?? "";
          const match = /^in:elements\.(\d+)\./.exec(handle);
          if (!match) return true;
          return Number(match[1]) !== index;
        })
        .map((edge) => {
          if (edge.target !== nodeId) return edge;
          const handle = edge.targetHandle ?? "";
          const match = /^in:elements\.(\d+)\.(.+)$/.exec(handle);
          if (!match) return edge;
          const handleIndex = Number(match[1]);
          if (handleIndex <= index) return edge;
          return {
            ...edge,
            targetHandle: `in:elements.${handleIndex - 1}.${match[2]}`,
          };
        }),
    );
  }

  function addElement() {
    if (elements.length >= KLING_V3_PRO_MAX_ELEMENTS) return;
    onChange([...elements, emptyElement()]);
  }

  return (
    <div className="space-y-2">
      <ElementsHeader label={label} helpTooltip={helpTooltip} />

      {elements.map((element, index) => (
        <KlingElementCard
          key={`element-${index}`}
          nodeId={nodeId}
          index={index}
          element={element}
          onChange={(next) =>
            onChange(elements.map((item, i) => (i === index ? next : item)))
          }
          onRemove={() => removeElement(index)}
          onClearReferenceEdges={clearReferenceEdges}
        />
      ))}

      {elements.length < KLING_V3_PRO_MAX_ELEMENTS ? (
        <button
          type="button"
          onClick={addElement}
          className="nodrag flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:border-workflow-accent-400 hover:text-workflow-accent-500 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-workflow-accent-500 dark:hover:text-workflow-accent-400"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add item
        </button>
      ) : null}
    </div>
  );
}
