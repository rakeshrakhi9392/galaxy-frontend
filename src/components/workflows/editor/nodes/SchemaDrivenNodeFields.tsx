"use client";

import { Info, RotateCcw } from "lucide-react";
import { Handle, Position } from "reactflow";
import type { NodeUiField, HandleDataType } from "@/generated/nodeRegistry";
import { getNodeDefinition } from "@/lib/editor/connectionValidation";
import { useWiredField } from "@/lib/editor/useWiredField";
import {
  displayBooleanValue,
  displayNumberValue,
  displayTextValue,
  mergeDisplayUrls,
} from "@/lib/editor/wiredFields";
import { MediaUrlInput } from "./MediaUrlInput";
import { ExpandableTextarea } from "./ExpandableTextarea";
import { ConnectorButton } from "./ConnectorButton";
import { NodeCombobox } from "./NodeCombobox";
import { ImageUploadField, SingleAudioPreview, SingleImagePreview, SingleVideoPreview } from "./ImageUploadField";
import { KlingElementsField } from "./KlingElementsField";
import {
  EXTRACT_AUDIO_FORMAT_OPTIONS,
  GPT_IMAGE_2_BACKGROUND_OPTIONS,
  GPT_IMAGE_2_COUNT_OPTIONS,
  GPT_IMAGE_2_MODE_OPTIONS,
  GPT_IMAGE_2_OUTPUT_FORMAT_OPTIONS,
  GPT_IMAGE_2_QUALITY_OPTIONS,
  GPT_IMAGE_2_SIZE_OPTIONS,
  isFieldVisible,
  KLING_V3_PRO_ASPECT_RATIO_OPTIONS,
  KLING_V3_PRO_DURATION_OPTIONS,
  KLING_V3_PRO_MODE_OPTIONS,
  MERGE_VIDEO_TRANSITION_OPTIONS,
  resolveFieldGroup,
  resolveFieldLabel,
  resolveFieldPlaceholder,
} from "@galaxy/schemas";

export { isFieldVisible };

export const HANDLE_CLASS_BY_TYPE: Record<HandleDataType, string> = {
  text: "!h-3.5 !w-3.5 !border-2 !border-amber-500/50 !bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.31)]",
  image: "!h-3.5 !w-3.5 !border-2 !border-blue-500/50 !bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.31)]",
  image_list: "!h-3.5 !w-3.5 !border-2 !border-blue-500/50 !bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.31)]",
  video: "!h-3.5 !w-3.5 !border-2 !border-green-500/50 !bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.31)]",
  video_list: "!h-3.5 !w-3.5 !border-2 !border-green-500/50 !bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.31)]",
  audio: "!h-3.5 !w-3.5 !border-2 !border-cyan-500/50 !bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.31)]",
  audio_list: "!h-3.5 !w-3.5 !border-2 !border-cyan-500/50 !bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.31)]",
  number: "!h-3.5 !w-3.5 !border-2 !border-pink-500/50 !bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.31)]",
  boolean: "!h-3.5 !w-3.5 !border-2 !border-green-500/50 !bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.31)]",
  enum: "!h-3.5 !w-3.5 !border-2 !border-indigo-500/50 !bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.31)]",
  any: "!h-3.5 !w-3.5 !border-2 !border-gray-400/50 !bg-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.31)]",
};

const OPTIONS_BY_KEY: Record<string, { value: string | number; label: string }[]> = {
  GPT_IMAGE_2_MODE_OPTIONS,
  GPT_IMAGE_2_SIZE_OPTIONS,
  GPT_IMAGE_2_QUALITY_OPTIONS,
  GPT_IMAGE_2_COUNT_OPTIONS,
  GPT_IMAGE_2_OUTPUT_FORMAT_OPTIONS,
  GPT_IMAGE_2_BACKGROUND_OPTIONS,
  KLING_V3_PRO_MODE_OPTIONS,
  KLING_V3_PRO_ASPECT_RATIO_OPTIONS,
  KLING_V3_PRO_DURATION_OPTIONS,
  MERGE_VIDEO_TRANSITION_OPTIONS,
  EXTRACT_AUDIO_FORMAT_OPTIONS,
};

function acceptForUploadField(dataType: HandleDataType): string {
  switch (dataType) {
    case "video":
    case "video_list":
      return "video/*,.mp4,.webm,.mov,.mkv,.avi";
    case "audio":
    case "audio_list":
      return "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac";
    default:
      return "image/*";
  }
}

function acceptForDataType(dataType: HandleDataType): string | null {
  switch (dataType) {
    case "image":
    case "image_list":
      return "image/*";
    case "video":
    case "video_list":
      return "video/*";
    case "audio":
    case "audio_list":
      return "audio/*";
    default:
      return null;
  }
}

function sliderDecimals(step: number): number {
  const stepText = String(step);
  const dot = stepText.indexOf(".");
  return dot === -1 ? 0 : stepText.length - dot - 1;
}

function clampSliderValue(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (step <= 0) return clamped;
  const snapped = Math.round(clamped / step) * step;
  return Number(snapped.toFixed(sliderDecimals(step)));
}

function HelpTooltipIcon({ text }: { text: string }) {
  return (
    <span className="group/tip relative ml-1 inline-flex shrink-0 cursor-pointer">
      <Info className="h-3 w-3 text-gray-400" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-full left-0 z-[9999] mb-1.5 hidden w-max max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
        {text}
      </div>
    </span>
  );
}

function SliderLabel({
  field,
  inputs,
}: {
  field: NodeUiField;
  inputs: Record<string, unknown>;
}) {
  const label = resolveFieldLabel(field, inputs);

  return (
    <span
      data-handle-anchor="label"
      className="flex min-w-0 shrink items-center truncate text-xs text-gray-500 dark:text-zinc-400"
    >
      {label}
      {field.helpTooltip ? <HelpTooltipIcon text={field.helpTooltip} /> : null}
    </span>
  );
}

function SliderFieldControl({
  field,
  nodeId,
  value,
  onChange,
}: {
  field: NodeUiField;
  nodeId: string;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const wired = useWiredField(nodeId, field.handleId ?? "");
  const connected = Boolean(field.handleId && wired.connected);
  const min = field.numberMin ?? 0;
  const max = field.numberMax ?? 1;
  const step = field.numberStep ?? 0.1;
  const resetValue = field.resetValue ?? min;
  const numeric = clampSliderValue(
    displayNumberValue(
      connected,
      wired.number,
      typeof value === "number" ? value : Number(value ?? resetValue),
    ),
    min,
    max,
    step,
  );

  function setValue(next: number) {
    if (connected) return;
    onChange(clampSliderValue(next, min, max, step));
  }

  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numeric}
        disabled={connected}
        onChange={(e) => setValue(Number(e.target.value))}
        className="nodrag h-2 min-w-[60px] flex-1 appearance-none rounded-lg bg-gray-200 accent-workflow-accent-500 disabled:opacity-50 dark:bg-zinc-700"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={numeric}
        disabled={connected}
        onChange={(e) => setValue(Number(e.target.value))}
        className="nodrag w-12 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-1.5 py-1 text-center text-xs text-gray-900 outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      />
      <button
        type="button"
        disabled={connected}
        onClick={() => setValue(resetValue)}
        aria-label={`Reset ${field.label}`}
        className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-[#F5F5F5] text-gray-400 hover:text-gray-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </>
  );
}

type SchemaDrivenNodeFieldsProps = {
  nodeId: string;
  nodeType: string;
  inputs: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
  group?: "primary" | "advanced";
  skipKeys?: string[];
};

function FieldHandle({ field }: { field: NodeUiField }) {
  if (!field.handleId) return null;

  const handleType = field.handleVariant ?? field.dataType;
  const handleTop =
    field.handleTop ?? (field.layout === "inline" ? 20 : 14);

  return (
    <div
      className="absolute flex items-center"
      style={{ left: -22, top: handleTop, transform: "translateY(-50%)", zIndex: 50 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={field.handleId}
        className={[
          HANDLE_CLASS_BY_TYPE[handleType],
          "!relative !transform-none",
        ].join(" ")}
      />
    </div>
  );
}

function FieldLabel({
  field,
  nodeId,
  inputs,
  inline = false,
}: {
  field: NodeUiField;
  nodeId: string;
  inputs: Record<string, unknown>;
  inline?: boolean;
}) {
  const label = resolveFieldLabel(field, inputs);

  if (inline) {
    return (
      <span
        data-handle-anchor="label"
        className="flex min-w-0 shrink items-center truncate text-xs text-gray-500 dark:text-zinc-400"
      >
        {label}
        {field.required ? <span className="text-red-400">*</span> : null}
        {field.helpTooltip ? <HelpTooltipIcon text={field.helpTooltip} /> : null}
      </span>
    );
  }

  return (
    <div
      data-handle-anchor="label"
      className="mb-1.5 flex items-center text-xs text-gray-500 dark:text-zinc-400"
    >
      <span className="flex items-center">
        {label}
        {field.required ? <span className="text-red-400">*</span> : null}
        {field.helpTooltip ? <HelpTooltipIcon text={field.helpTooltip} /> : null}
      </span>
      {field.handleId ? (
        <span className="ml-auto">
          <ConnectorButton
            nodeId={nodeId}
            handleId={field.handleId}
            fieldLabel={label}
          />
        </span>
      ) : null}
    </div>
  );
}

function SelectLabelRow({
  field,
  nodeId,
  inputs,
}: {
  field: NodeUiField;
  nodeId: string;
  inputs: Record<string, unknown>;
}) {
  const label = resolveFieldLabel(field, inputs);

  return (
    <div className="flex min-w-0 items-center text-xs text-gray-500 dark:text-zinc-400">
      <span data-handle-anchor="label" className="flex items-center">
        {label}
        {field.required ? <span className="text-red-400">*</span> : null}
      </span>
      {field.handleId ? (
        <span className="ml-auto">
          <ConnectorButton
            nodeId={nodeId}
            handleId={field.handleId}
            fieldLabel={label}
          />
        </span>
      ) : null}
    </div>
  );
}

function ModeTabsField({
  field,
  value,
  onChange,
}: {
  field: NodeUiField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const options = field.optionsKey ? (OPTIONS_BY_KEY[field.optionsKey] ?? []) : [];
  const current = String(value ?? options[0]?.value ?? "");

  return (
    <div className="nodrag flex w-full items-center rounded-[18px] border border-gray-200 bg-gray-100 p-1 dark:border-zinc-800 dark:bg-[#1F1F1F]">
      {options.map((option) => {
        const selected = current === String(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "flex-1 rounded-[14px] px-3 py-1.5 text-center text-xs font-medium",
              selected
                ? "bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900"
                : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldControl({
  field,
  nodeId,
  inputs,
  value,
  onChange,
  hideImagePreview = false,
}: {
  field: NodeUiField;
  nodeId: string;
  inputs: Record<string, unknown>;
  value: unknown;
  onChange: (next: unknown) => void;
  hideImagePreview?: boolean;
}) {
  const wired = useWiredField(nodeId, field.handleId ?? "");
  const connected = Boolean(field.handleId && wired.connected);
  const fieldLabel = resolveFieldLabel(field, inputs);
  const fieldPlaceholder = resolveFieldPlaceholder(field, inputs);

  if (field.control === "mode_tabs") {
    return <ModeTabsField field={field} value={value} onChange={onChange} />;
  }

  if (field.control === "kling_elements") {
    return (
      <KlingElementsField
        nodeId={nodeId}
        label={fieldLabel}
        helpTooltip={field.helpTooltip}
        value={value}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.control === "image_upload") {
    const uploadAccept = acceptForUploadField(field.dataType);
    const uploadLabel =
      field.dataType === "audio" || field.dataType === "audio_list"
        ? "Upload audio"
        : field.dataType === "video" || field.dataType === "video_list"
          ? "Upload video"
          : undefined;
    const isList =
      field.dataType === "video_list" ||
      field.dataType === "image_list" ||
      field.dataType === "audio_list";

    if (isList) {
      const localList = Array.isArray(value)
        ? (value as string[]).filter((item) => typeof item === "string" && item.length > 0)
        : [];
      const { displayUrls, wiredSet } = mergeDisplayUrls(wired.urls, localList);

      return (
        <ImageUploadField
          multiple
          values={displayUrls}
          onChange={(next) => {
            onChange(next.filter((url) => !wiredSet.has(url)));
          }}
          canRemoveItem={(url) => !wiredSet.has(url)}
          helpText={field.helpText}
          helpTooltip={field.helpTooltip}
          accept={uploadAccept}
          buttonLabel={uploadLabel}
          maxItems={field.dataType === "video_list" ? 20 : undefined}
        />
      );
    }

    const display = displayTextValue(
      connected,
      wired.text,
      typeof value === "string" ? value : "",
    );
    return (
      <ImageUploadField
        value={display}
        onChange={(next) => onChange(next)}
        disabled={connected}
        helpText={field.helpText}
        helpTooltip={field.helpTooltip}
        accept={uploadAccept}
        buttonLabel={uploadLabel}
        hidePreview={hideImagePreview}
      />
    );
  }

  if (field.control === "textarea") {
    const display = displayTextValue(
      connected,
      wired.text,
      typeof value === "string" ? value : "",
    );
    return (
      <ExpandableTextarea
        value={display}
        onChange={(next) => onChange(next)}
        title={fieldLabel}
        rows={field.textareaRows ?? 3}
        readOnly={connected}
        maxLength={field.maxLength}
        placeholder={
          connected ? wired.placeholder : fieldPlaceholder
        }
        showCharCount={Boolean(field.maxLength)}
      />
    );
  }

  if (field.control === "url") {
    const accept = acceptForDataType(field.dataType);
    const display = displayTextValue(
      connected,
      wired.text,
      typeof value === "string" ? value : "",
    );
    if (accept) {
      return (
        <MediaUrlInput
          value={display}
          onChange={onChange}
          accept={accept}
          placeholder={connected ? wired.placeholder : "Paste URL..."}
          disabled={connected}
        />
      );
    }

    return (
      <input
        value={display}
        onChange={(e) => onChange(e.target.value)}
        readOnly={connected}
        placeholder={connected ? wired.placeholder : "Paste URL..."}
        className="nodrag w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4f46e6] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      />
    );
  }

  if (field.control === "url_list") {
    const list = Array.isArray(value) ? (value as string[]) : [];
    const text = connected ? wired.text : list.join("\n");
    return (
      <textarea
        value={text}
        readOnly={connected}
        onChange={(e) => {
          const next = e.target.value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          onChange(next);
        }}
        rows={3}
        placeholder={connected ? wired.placeholder : "One URL per line"}
        className="nodrag nowheel w-full resize-y rounded-lg border border-gray-200 bg-[#F5F5F5] p-3 text-sm text-gray-900 outline-none focus:border-[#4f46e6] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      />
    );
  }

  if (field.control === "select" && field.optionsKey) {
    const options = OPTIONS_BY_KEY[field.optionsKey] ?? [];
    const resolvedValue = connected
      ? displayTextValue(true, wired.text, String(value ?? ""))
      : value ?? options[0]?.value ?? "";
    const comboboxClass =
      field.layout === "select_primary"
        ? "bg-surface-main-background-3 disabled:opacity-60"
        : "";

    return (
      <NodeCombobox
        value={resolvedValue as string | number}
        options={options}
        disabled={connected}
        className={comboboxClass}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.control === "boolean") {
    const checked = displayBooleanValue(
      connected,
      wired.boolean,
      value === true || value === "true",
    );
    const showValueLabels = field.layout === "inline";
    const switchButton = (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={connected}
        onClick={() => onChange(!checked)}
        className={[
          "nodrag peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-workflow-accent-500" : "bg-input",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    );

    if (showValueLabels) {
      return (
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={[
              "text-[10px] font-medium",
              checked
                ? "text-gray-400 dark:text-zinc-500"
                : "text-gray-600 dark:text-zinc-300",
            ].join(" ")}
          >
            False
          </span>
          {switchButton}
          <span
            className={[
              "text-[10px] font-medium",
              checked
                ? "text-gray-600 dark:text-zinc-300"
                : "text-gray-400 dark:text-zinc-500",
            ].join(" ")}
          >
            True
          </span>
        </div>
      );
    }

    return switchButton;
  }

  if (field.control === "number") {
    const numeric = displayNumberValue(
      connected,
      wired.number,
      typeof value === "number" ? value : Number(value ?? 0),
    );
    const inlineCompact = field.layout === "inline";
    return (
      <input
        type="number"
        min={field.numberMin}
        max={field.numberMax}
        step={field.numberStep}
        value={numeric}
        readOnly={connected}
        onChange={(e) => onChange(Number(e.target.value))}
        className={
          inlineCompact
            ? "nodrag w-20 shrink-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-center text-sm text-gray-900 outline-none focus:border-workflow-accent-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            : "nodrag w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4f46e6] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        }
      />
    );
  }

  const text = displayTextValue(
    connected,
    wired.text,
    typeof value === "string" ? value : String(value ?? ""),
  );
  return (
    <input
      value={text}
      readOnly={connected}
      onChange={(e) => onChange(e.target.value)}
      className="nodrag w-full rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4f46e6] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
    />
  );
}

export function SchemaDrivenNodeModeTabs({
  nodeId,
  nodeType,
  inputs,
  onPatch,
}: Omit<SchemaDrivenNodeFieldsProps, "group" | "skipKeys">) {
  const definition = getNodeDefinition(nodeType);
  if (!definition) return null;

  const modeField = definition.ui.fields.find(
    (field: NodeUiField) => field.control === "mode_tabs" && field.group === "primary",
  );
  if (!modeField || !isFieldVisible(modeField, inputs)) return null;

  return (
    <FieldControl
      field={modeField}
      nodeId={nodeId}
      inputs={inputs}
      value={inputs[modeField.key]}
      onChange={(next) => onPatch({ [modeField.key]: next })}
    />
  );
}

function ImageUploadFieldLayout({
  field,
  nodeId,
  inputs,
  onPatch,
}: {
  field: NodeUiField;
  nodeId: string;
  inputs: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const label = resolveFieldLabel(field, inputs);
  const wired = useWiredField(nodeId, field.handleId ?? "");
  const connected = Boolean(field.handleId && wired.connected);
  const value = inputs[field.key];
  const isSingleImage = field.dataType === "image";
  const isSingleVideo = field.dataType === "video";
  const isSingleAudio = field.dataType === "audio";
  const display = displayTextValue(
    connected,
    wired.text,
    typeof value === "string" ? value : "",
  );

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <FieldHandle field={field} />
      <div className="flex items-start gap-3">
        <span
          data-handle-anchor="label"
          className="shrink-0 pt-2 text-xs text-gray-500 dark:text-zinc-400"
        >
          {label}
          {field.required ? <span className="text-red-400">*</span> : null}
        </span>
        <div className="min-w-0 flex-1">
          <FieldControl
            field={field}
            nodeId={nodeId}
            inputs={inputs}
            value={value}
            onChange={(next) => onPatch({ [field.key]: next })}
            hideImagePreview={isSingleImage || isSingleVideo || isSingleAudio}
          />
        </div>
        {field.handleId ? (
          <ConnectorButton
            nodeId={nodeId}
            handleId={field.handleId}
            fieldLabel={label}
            className="mt-1.5"
          />
        ) : null}
      </div>
      {isSingleImage && display ? (
        <SingleImagePreview
          url={display}
          disabled={connected}
          onRemove={() => onPatch({ [field.key]: "" })}
        />
      ) : null}
      {isSingleVideo && display ? (
        <SingleVideoPreview
          url={display}
          disabled={connected}
          onRemove={() => onPatch({ [field.key]: "" })}
        />
      ) : null}
      {isSingleAudio && display ? (
        <SingleAudioPreview
          url={display}
          disabled={connected}
          onRemove={() => onPatch({ [field.key]: "" })}
        />
      ) : null}
    </div>
  );
}

function renderField(
  field: NodeUiField,
  nodeId: string,
  inputs: Record<string, unknown>,
  onPatch: (patch: Record<string, unknown>) => void,
) {
  const label = resolveFieldLabel(field, inputs);
  const control = (
    <FieldControl
      field={field}
      nodeId={nodeId}
      inputs={inputs}
      value={inputs[field.key]}
      onChange={(next) => onPatch({ [field.key]: next })}
    />
  );

  if (field.control === "kling_elements") {
    return <div key={field.key}>{control}</div>;
  }

  if (field.layout === "image_upload" || field.control === "image_upload") {
    return (
      <ImageUploadFieldLayout
        key={field.key}
        field={field}
        nodeId={nodeId}
        inputs={inputs}
        onPatch={onPatch}
      />
    );
  }

  if (field.layout === "slider" || field.control === "slider") {
    return (
      <div key={field.key} className="relative" style={{ overflow: "visible" }}>
        <FieldHandle field={field} />
        <div className="space-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <SliderLabel field={field} inputs={inputs} />
            <SliderFieldControl
              field={field}
              nodeId={nodeId}
              value={inputs[field.key]}
              onChange={(next) => onPatch({ [field.key]: next })}
            />
            {field.handleId ? (
              <ConnectorButton
                nodeId={nodeId}
                handleId={field.handleId}
                fieldLabel={label}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (field.layout === "inline") {
    const isBoolean = field.control === "boolean";
    const isCompactNumber = field.control === "number";
    return (
      <div key={field.key} className="relative" style={{ overflow: "visible" }}>
        <FieldHandle field={field} />
        <div className="space-y-1.5">
          <div className="flex min-w-0 items-center gap-3">
            <FieldLabel field={field} nodeId={nodeId} inputs={inputs} inline />
            {isBoolean || isCompactNumber ? (
              control
            ) : (
              <div className="flex-1">{control}</div>
            )}
            {field.handleId ? (
              <ConnectorButton
                nodeId={nodeId}
                handleId={field.handleId}
                fieldLabel={label}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (field.layout === "select_primary") {
    return (
      <div key={field.key} className="relative" style={{ overflow: "visible" }}>
        <FieldHandle field={field} />
        <div className="space-y-2">
          <SelectLabelRow field={field} nodeId={nodeId} inputs={inputs} />
          {control}
        </div>
      </div>
    );
  }

  return (
    <div key={field.key} className="relative" style={{ overflow: "visible" }}>
      <FieldHandle field={field} />
      <FieldLabel field={field} nodeId={nodeId} inputs={inputs} />
      {control}
    </div>
  );
}

export function SchemaDrivenNodeFields({
  nodeId,
  nodeType,
  inputs,
  onPatch,
  group,
  skipKeys = [],
}: SchemaDrivenNodeFieldsProps) {
  const definition = getNodeDefinition(nodeType);
  if (!definition) return null;

  const fields = definition.ui.fields.filter((field: NodeUiField) => {
    if (skipKeys.includes(field.key)) return false;
    if (field.control === "mode_tabs") return false;
    if (group) return resolveFieldGroup(field, inputs) === group;
    return true;
  });

  return (
    <div className="space-y-4">
      {fields.map((field: NodeUiField) => {
        if (!isFieldVisible(field, inputs)) return null;
        return renderField(field, nodeId, inputs, onPatch);
      })}
    </div>
  );
}

export function getSchemaFields(
  nodeType: string,
  group?: "primary" | "advanced",
  inputs: Record<string, unknown> = {},
) {
  const definition = getNodeDefinition(nodeType);
  if (!definition) return [];
  return definition.ui.fields.filter((field: NodeUiField) => {
    if (group) return resolveFieldGroup(field, inputs) === group;
    return true;
  });
}
