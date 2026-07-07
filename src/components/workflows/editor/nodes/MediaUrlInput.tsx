"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  ChatUploadPopoverContent,
  useChatUploadPopover,
} from "@/components/workflows/ChatUploadPopover";
import { useClientApi } from "@/lib/useClientApi";
import { uploadMediaFile } from "@/lib/uploads/api";

type MediaUrlInputProps = {
  value: string;
  onChange: (value: string) => void;
  accept: string;
  placeholder?: string;
  className?: string;
  onSelectAsset?: () => void;
  disabled?: boolean;
};

const DEFAULT_INPUT_CLASS =
  "nodrag w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4f46e6] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

export function MediaUrlInput({
  value,
  onChange,
  accept,
  placeholder = "Paste URL...",
  className = DEFAULT_INPUT_CLASS,
  onSelectAsset,
  disabled = false,
}: MediaUrlInputProps) {
  const { clientFetch } = useClientApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { open, position, popoverRef, closePopover, togglePopover } =
    useChatUploadPopover(triggerRef);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUploadFromDevice() {
    fileInputRef.current?.click();
    closePopover();
  }

  function handleSelectAsset() {
    closePopover();
    onSelectAsset?.();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const hosted = await uploadMediaFile(file, clientFetch);
      onChange(hosted.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const inputClassName = `${className} min-w-0 flex-1`;

  return (
    <div className="space-y-1">
      <div className="relative flex min-w-0 items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
          disabled={uploading || disabled}
          readOnly={disabled}
        />
        <button
          ref={triggerRef}
          type="button"
          tabIndex={-1}
          disabled={uploading || disabled}
          onClick={togglePopover}
          aria-label="Upload file"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="nodrag shrink-0 rounded-md border border-gray-200 bg-[#F5F5F5] p-2 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />

        <ChatUploadPopoverContent
          open={open}
          position={position}
          popoverRef={popoverRef}
          onUploadFromDevice={handleUploadFromDevice}
          onSelectAsset={handleSelectAsset}
        />
      </div>
      {error ? (
        <p className="text-[10px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function acceptForMediaFieldType(
  type: "image" | "video" | "audio" | "media" | "file",
): string {
  switch (type) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "media":
      return "audio/*,video/*,image/*";
    case "file":
      return "*/*";
  }
}
