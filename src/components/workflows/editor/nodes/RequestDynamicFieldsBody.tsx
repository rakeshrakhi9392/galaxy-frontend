"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import {
  AlignLeft,
  Check,
  Copy,
  File,
  GripVertical,
  Hash,
  Image,
  Info,
  Maximize2,
  Music,
  Pencil,
  Plus,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { ExpandTextDialog } from "./ExpandTextDialog";
import { createFieldId } from "@/lib/editor/graphUtils";
import { acceptForMediaFieldType, MediaUrlInput } from "./MediaUrlInput";
import { useWorkflowCanvasActions } from "../WorkflowCanvasActions";

const AMBER_HANDLE =
  "!relative !h-3.5 !w-3.5 !transform-none !border-2 !border-amber-500/50 !bg-amber-500";

type FieldType = "text" | "number" | "boolean" | "image" | "audio" | "video" | "media" | "file";

type DynamicField = {
  id: string;
  name: string;
  type: FieldType;
  value: string;
};

const FIELD_TYPE_OPTIONS: { type: FieldType; label: string; icon: LucideIcon }[] = [
  { type: "text", label: "Text", icon: AlignLeft },
  { type: "number", label: "Number", icon: Hash },
  { type: "boolean", label: "Boolean", icon: Check },
  { type: "image", label: "Image", icon: Image },
  { type: "audio", label: "Audio", icon: Music },
  { type: "video", label: "Video", icon: Video },
  { type: "media", label: "Media", icon: Music },
  { type: "file", label: "File", icon: File },
];

function defaultFieldName(type: FieldType): string {
  return `${type}_field`;
}

function fieldPlaceholder(type: FieldType): string {
  switch (type) {
    case "text":
      return "Enter text...";
    case "number":
      return "Enter number...";
    case "boolean":
      return "";
    case "image":
      return "Paste image URL...";
    case "audio":
      return "Paste audio URL...";
    case "video":
      return "Paste video URL...";
    case "media":
      return "Paste media URL...";
    case "file":
      return "Paste file URL...";
  }
}

export type RequestDynamicFieldsData = {
  label?: string;
  config?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  dynamicFields?: DynamicField[];
};

const FIELD_TYPES = new Set<FieldType>(FIELD_TYPE_OPTIONS.map((option) => option.type));

function normalizeField(raw: DynamicField): DynamicField {
  const type = FIELD_TYPES.has(raw.type) ? raw.type : "text";
  return {
    id: raw.id,
    name: raw.name,
    type,
    value: typeof raw.value === "string" ? raw.value : type === "boolean" ? "false" : "",
  };
}

function asFields(data: RequestDynamicFieldsData): DynamicField[] {
  if (!Array.isArray(data.dynamicFields)) return [];
  return data.dynamicFields.map((field) => normalizeField(field as DynamicField));
}

function AddFieldMenu({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: (type: FieldType) => void;
}) {
  if (!open) return null;

  return (
    <div
      role="menu"
      aria-orientation="vertical"
      className="nodrag absolute right-0 top-full z-50 mt-1 w-[140px] min-w-[8rem] overflow-hidden rounded-[18px] border border-border/20 bg-popover p-1 text-popover-foreground shadow-lg"
    >
      {FIELD_TYPE_OPTIONS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          onClick={() => onSelect(type)}
          className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-[18px] px-3 py-2 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground dark:hover:bg-neutral-700"
        >
          <span className="text-gray-600 dark:text-zinc-400">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function FieldValueInput({
  field,
  onChange,
  onExpand,
}: {
  field: DynamicField;
  onChange: (value: string) => void;
  onExpand: () => void;
}) {
  const inputClassName =
    "nodrag nowheel w-full min-w-0 rounded-lg border border-gray-200 bg-[#F5F5F5] px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4f46e6] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

  if (field.type === "text") {
    return (
      <div className="relative">
        <textarea
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fieldPlaceholder(field.type)}
          rows={3}
          className={`${inputClassName} resize-y`}
        />
        <button
          type="button"
          onClick={onExpand}
          className="nodrag absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-200/80 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700 dark:bg-zinc-700/80 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-white"
          title="Expand"
        >
          <Maximize2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (field.type === "boolean") {
    const checked = field.value === "true";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(checked ? "false" : "true")}
        className={[
          "nodrag relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          checked
            ? "border-[#4f46e6] bg-[#4f46e6]"
            : "border-gray-200 bg-gray-200 dark:border-zinc-700 dark:bg-zinc-700",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    );
  }

  if (
    field.type === "image" ||
    field.type === "audio" ||
    field.type === "video" ||
    field.type === "media" ||
    field.type === "file"
  ) {
    return (
      <MediaUrlInput
        value={field.value}
        onChange={onChange}
        accept={acceptForMediaFieldType(field.type)}
        placeholder={fieldPlaceholder(field.type)}
        className={inputClassName}
      />
    );
  }

  return (
    <input
      type={field.type === "number" ? "number" : "text"}
      value={field.value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={fieldPlaceholder(field.type)}
      className={inputClassName}
    />
  );
}

function fieldHandleTop(type: FieldType): number {
  return type === "text" ? 38.67 : 28;
}

function FieldInfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/tip relative" style={{ overflow: "visible" }}>
      <Info
        className="h-3 w-3 cursor-help text-gray-400 dark:text-zinc-500"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-800">
        {text}
      </div>
    </div>
  );
}

function RequestFieldRow({
  field,
  canDelete,
  isDragging,
  isDropTarget,
  onValueChange,
  onNameChange,
  onCopy,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  field: DynamicField;
  canDelete: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onValueChange: (value: string) => void;
  onNameChange: (name: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(field.name);
  const [expanded, setExpanded] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) setDraftName(field.name);
  }, [field.name, editingName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function commitName() {
    const trimmed = draftName.trim();
    if (trimmed) onNameChange(trimmed);
    else setDraftName(field.name);
    setEditingName(false);
  }

  return (
    <>
      <div
        className={[
          "relative w-full",
          isDragging ? "opacity-40" : "",
          isDropTarget ? "rounded-lg ring-2 ring-[#4f46e6]/30" : "",
        ].join(" ")}
        style={{ overflow: "visible" }}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
      >
        <div className="w-full min-w-0">
          <div className="mb-2 flex w-full min-w-0 items-center gap-2">
            <div
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onDragStart();
              }}
              onDragEnd={onDragEnd}
              className="nodrag nopan shrink-0 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </div>

            {editingName ? (
              <input
                ref={nameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setDraftName(field.name);
                    setEditingName(false);
                  }
                }}
                className="nodrag min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-900 outline-none focus:border-[#4f46e6] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="group/label nodrag flex min-w-0 flex-1 items-center gap-1 text-left text-xs font-medium text-gray-900 hover:text-[#4f46e6] dark:text-white dark:hover:text-[#818cf8]"
              >
                <span className="truncate" title={field.name}>
                  {field.name}
                </span>
                <Pencil
                  className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/label:opacity-100"
                  aria-hidden="true"
                />
                <FieldInfoTooltip text={`Workflow input: ${field.name}`} />
              </button>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                tabIndex={-1}
                onClick={onCopy}
                className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="Copy value"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={onDelete}
                disabled={!canDelete}
                className="nodrag rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="w-full min-w-0">
            <FieldValueInput
              field={field}
              onChange={onValueChange}
              onExpand={() => setExpanded(true)}
            />
          </div>
        </div>

        <div
          className="pointer-events-none absolute flex items-center"
          style={{
            right: -21,
            top: fieldHandleTop(field.type),
            transform: "translateY(-50%)",
            zIndex: 50,
          }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id={field.id}
            className={`${AMBER_HANDLE} nodrag nopan connectable connectablestart connectableend connectionindicator`}
            style={{ pointerEvents: "auto" }}
          />
        </div>
      </div>

      <ExpandTextDialog
        open={expanded && field.type === "text"}
        title={field.name}
        value={field.value}
        onChange={onValueChange}
        onClose={() => setExpanded(false)}
      />
    </>
  );
}

type RequestDynamicFieldsBodyProps = {
  nodeId: string;
  data: RequestDynamicFieldsData;
  title: string;
  description?: string;
};

/** Config-driven body for `ui.body === "dynamic_fields"`. */
export function RequestDynamicFieldsBody({
  nodeId,
  data,
  title,
  description,
}: RequestDynamicFieldsBodyProps) {
  const { setEdges } = useReactFlow();
  const canvasActions = useWorkflowCanvasActions();
  const fields = asFields(data);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateFields = useCallback(
    (next: DynamicField[]) => {
      canvasActions?.patchNodeData(nodeId, {
        label: data.label ?? title,
        config: data.config ?? {},
        inputs: data.inputs ?? {},
        dynamicFields: next,
      });
    },
    [canvasActions, data.config, data.inputs, data.label, nodeId, title],
  );

  function addField(type: FieldType) {
    const fieldId = createFieldId();
    const defaultValue = type === "boolean" ? "false" : "";
    updateFields([
      ...fields,
      { id: fieldId, name: defaultFieldName(type), type, value: defaultValue },
    ]);
    setMenuOpen(false);
  }

  function deleteField(fieldId: string) {
    if (fields.length <= 1) return;
    updateFields(fields.filter((field) => field.id !== fieldId));
    setEdges((edges) =>
      edges.filter((edge) => !(edge.source === nodeId && edge.sourceHandle === fieldId)),
    );
  }

  function reorderFields(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= fields.length || to >= fields.length) {
      return;
    }
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateFields(next);
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyToast(true);
      window.setTimeout(() => setCopyToast(false), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts.
    }
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as HTMLElement)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <>
      <div
        className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
          {description ? (
            <div className="group/tip relative" style={{ overflow: "visible" }}>
              <Info
                className="h-3.5 w-3.5 cursor-default text-gray-400 dark:text-zinc-500"
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-1.5 hidden w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg group-hover/tip:block dark:bg-zinc-100">
                {description}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative flex items-center gap-1.5" ref={menuRef}>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setMenuOpen((open) => !open)}
            className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-surface-main-background-3 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>

          <AddFieldMenu open={menuOpen} onSelect={addField} />
        </div>
      </div>

      <div className="relative w-full px-4 py-4" style={{ overflow: "visible" }}>
        <div className="w-full space-y-4">
          {fields.map((field, index) => (
            <RequestFieldRow
              key={field.id}
              field={field}
              canDelete={fields.length > 1}
              isDragging={dragIndex === index}
              isDropTarget={dropIndex === index && dragIndex !== null && dragIndex !== index}
              onValueChange={(value) => {
                updateFields(
                  fields.map((item) => (item.id === field.id ? { ...item, value } : item)),
                );
              }}
              onNameChange={(name) => {
                updateFields(
                  fields.map((item) => (item.id === field.id ? { ...item, name } : item)),
                );
              }}
              onCopy={() => void copyValue(field.value)}
              onDelete={() => deleteField(field.id)}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(index);
              }}
              onDrop={() => {
                if (dragIndex !== null) reorderFields(dragIndex, index);
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
            />
          ))}
        </div>

        {copyToast ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-50 -translate-x-1/2 animate-field-copy-toast rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Copied to clipboard
          </div>
        ) : null}
      </div>
    </>
  );
}
