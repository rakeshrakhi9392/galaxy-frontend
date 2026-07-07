import { DEFAULT_WORKFLOW_THUMBNAIL } from "@/lib/workflowDefaults";

const STORAGE_KEY = "galaxy.workflowThumbnails";

type ThumbnailMap = Record<string, string>;

function readMap(): ThumbnailMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ThumbnailMap;
  } catch {
    return {};
  }
}

function writeMap(map: ThumbnailMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getWorkflowThumbnail(workflowId: string, fallback = DEFAULT_WORKFLOW_THUMBNAIL) {
  return readMap()[workflowId] ?? fallback;
}

export function setWorkflowThumbnail(workflowId: string, dataUrl: string) {
  const map = readMap();
  map[workflowId] = dataUrl;
  writeMap(map);
}

export function clearWorkflowThumbnail(workflowId: string) {
  const map = readMap();
  delete map[workflowId];
  writeMap(map);
}

export function readWorkflowThumbnailFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}
