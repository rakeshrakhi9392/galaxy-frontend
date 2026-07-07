type EditorNode = {
  id: string;
  type?: string | null;
  data?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isRequestFieldId(key: string): boolean {
  return key.startsWith("field_");
}

/** Maps request node id → field id → user-visible field name from node.data.dynamicFields. */
export function buildRequestFieldLabelMaps(
  nodes: EditorNode[],
): Map<string, Record<string, string>> {
  const maps = new Map<string, Record<string, string>>();

  for (const node of nodes) {
    if (node.type !== "request") continue;

    const fields = asRecord(node.data).dynamicFields;
    if (!Array.isArray(fields)) continue;

    const labelMap: Record<string, string> = {};
    for (const field of fields) {
      if (!field || typeof field !== "object") continue;
      const record = field as { id?: unknown; name?: unknown };
      if (typeof record.id !== "string" || !isRequestFieldId(record.id)) continue;
      if (typeof record.name !== "string" || record.name.trim().length === 0) continue;
      labelMap[record.id] = record.name;
    }

    if (Object.keys(labelMap).length > 0) {
      maps.set(node.id, labelMap);
    }
  }

  return maps;
}

/** Rewrites top-level request field ids to the user-visible names shown on the node. */
export function remapRequestFieldKeys(
  value: unknown,
  fieldIdToName: Record<string, string>,
): unknown {
  if (fieldIdToName == null || Object.keys(fieldIdToName).length === 0) return value;
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;

  const record = value as Record<string, unknown>;
  let changed = false;
  const next: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(record)) {
    const mappedKey = isRequestFieldId(key) ? (fieldIdToName[key] ?? key) : key;
    if (mappedKey !== key) changed = true;
    next[mappedKey] = entryValue;
  }

  return changed ? next : value;
}
