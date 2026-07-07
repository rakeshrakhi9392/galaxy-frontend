import type { Edge, Node } from "reactflow";
import {
  inputFieldFromHandle,
  mergeWiredText,
  mergeWiredUrls,
  parseWiredBoolean,
  parseWiredNumber,
  valueToText,
  valueToUrlList,
} from "@galaxy/schemas";

const WIRED_PLACEHOLDER = "Editing disabled — field is connected";

function edgeTargetHandle(edge: Edge): string {
  const data = asRecord(edge.data);
  return edge.targetHandle ?? (typeof data.targetHandle === "string" ? data.targetHandle : "");
}

export function isHandleConnected(
  edges: Edge[] | undefined,
  nodeId: string,
  handleId: string,
): boolean {
  if (!edges?.length) return false;
  return edges.some((edge) => {
    if (edge.target !== nodeId) return false;
    const targetHandle = edgeTargetHandle(edge);
    if (targetHandle === handleId) return true;
    return inputFieldFromHandle(targetHandle) === inputFieldFromHandle(handleId);
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function liveSourceValue(
  sourceNode: Node | undefined,
  sourceHandle: string | null | undefined,
): unknown {
  if (!sourceNode || !sourceHandle) return "";

  if (sourceNode.type === "request" && sourceHandle.startsWith("field_")) {
    const fields = asRecord(sourceNode.data).dynamicFields;
    if (Array.isArray(fields)) {
      const field = fields.find(
        (item) =>
          item &&
          typeof item === "object" &&
          "id" in item &&
          (item as { id: string }).id === sourceHandle,
      ) as { value?: unknown } | undefined;
      return field?.value ?? "";
    }
    return "";
  }

  const data = asRecord(sourceNode.data);
  if (sourceHandle.startsWith("out:")) {
    const key = sourceHandle.slice(4);
    const lastOutput = data.lastOutput;
    if (lastOutput != null) {
      if (typeof lastOutput === "object" && !Array.isArray(lastOutput)) {
        const record = lastOutput as Record<string, unknown>;
        if (key in record) return record[key];
      }
      if (key === "output" && typeof lastOutput === "string") return lastOutput;
      if (key === "result" && Array.isArray(lastOutput)) return lastOutput;
      return lastOutput;
    }
    const inputs = asRecord(data.inputs);
    if (key in inputs) return inputs[key];
    return "";
  }

  return "";
}

export function resolveLiveWiredValues(
  nodes: Node[] | undefined,
  edges: Edge[] | undefined,
  nodeId: string,
  handleId: string,
): unknown[] {
  if (!nodes?.length || !edges?.length) return [];

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = edges.filter((edge) => {
    if (edge.target !== nodeId) return false;
    const targetHandle = edgeTargetHandle(edge);
    if (targetHandle === handleId) return true;
    return inputFieldFromHandle(targetHandle) === inputFieldFromHandle(handleId);
  });

  return incoming.map((edge) =>
    liveSourceValue(nodesById.get(edge.source), edge.sourceHandle),
  );
}

export type WiredFieldView = {
  connected: boolean;
  text: string;
  urls: string[];
  number: number | null;
  boolean: boolean | null;
  placeholder: string;
};

export function buildWiredFieldView(
  nodes: Node[] | undefined,
  edges: Edge[] | undefined,
  nodeId: string,
  handleId: string,
): WiredFieldView {
  const connected = isHandleConnected(edges, nodeId, handleId);
  if (!connected) {
    return {
      connected: false,
      text: "",
      urls: [],
      number: null,
      boolean: null,
      placeholder: WIRED_PLACEHOLDER,
    };
  }

  const values = resolveLiveWiredValues(nodes, edges, nodeId, handleId);
  const text = mergeWiredText(values);
  return {
    connected: true,
    text,
    urls: mergeWiredUrls(values),
    number: parseWiredNumber(text),
    boolean: parseWiredBoolean(text),
    placeholder: WIRED_PLACEHOLDER,
  };
}

export function mergeDisplayUrls(wiredUrls: string[], localUrls: string[], maxCount = 32): {
  displayUrls: string[];
  wiredSet: Set<string>;
} {
  const wiredSet = new Set(wiredUrls);
  const displayUrls = [...wiredUrls];
  for (const url of localUrls) {
    if (wiredSet.has(url)) continue;
    displayUrls.push(url);
    if (displayUrls.length >= maxCount) break;
  }
  return { displayUrls, wiredSet };
}

export function displayTextValue(connected: boolean, wiredText: string, localText: string): string {
  return connected ? wiredText : localText;
}

export function displayNumberValue(
  connected: boolean,
  wiredNumber: number | null,
  localNumber: number,
): number {
  return connected && wiredNumber != null ? wiredNumber : localNumber;
}

export function displayBooleanValue(
  connected: boolean,
  wiredBoolean: boolean | null,
  localBoolean: boolean,
): boolean {
  return connected && wiredBoolean != null ? wiredBoolean : localBoolean;
}

export { valueToText, valueToUrlList, WIRED_PLACEHOLDER };
