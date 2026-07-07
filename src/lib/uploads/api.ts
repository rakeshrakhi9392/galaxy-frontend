import type { UploadResponse, UploadsConfigResponse } from "@galaxy/schemas";
import {
  clientFetch,
  clientRequest,
  readBackendErrorMessage,
} from "@/lib/backend";

export type { UploadResponse, UploadsConfigResponse };

let cachedConfig: UploadsConfigResponse | null = null;
let configPromise: Promise<UploadsConfigResponse> | null = null;

function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function isAudioFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("audio/")) return true;
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
}

function isVideoFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/i.test(file.name);
}

function isPdfFile(file: File): boolean {
  if (file.type.toLowerCase() === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

function maxBytesForFile(file: File, config: UploadsConfigResponse): number | null {
  if (isAudioFile(file)) return config.maxAudioBytes;
  if (isVideoFile(file)) return config.maxVideoBytes;
  if (isImageFile(file)) return config.maxImageBytes;
  if (isPdfFile(file)) return config.maxPdfBytes;
  return config.maxVideoBytes;
}

function assertClientUploadLimits(file: File, config: UploadsConfigResponse): void {
  if (file.size <= 0) {
    throw new Error("Empty files are not allowed. Please choose a real file.");
  }

  const maxBytes = maxBytesForFile(file, config);
  if (maxBytes != null && file.size > maxBytes) {
    throw new Error(
      `File is too large (${formatByteSize(file.size)}). Maximum upload size is ${formatByteSize(maxBytes)}.`,
    );
  }

  if (isAudioFile(file) && config.minAudioBytes != null && file.size < config.minAudioBytes) {
    throw new Error(
      `This audio file is too small (${formatByteSize(file.size)}). Valid audio files must be at least ${formatByteSize(config.minAudioBytes)}. The file may be empty, corrupt, or not a real audio file.`,
    );
  }

  if (isVideoFile(file) && config.minVideoBytes != null && file.size < config.minVideoBytes) {
    throw new Error(
      `This video file is too small (${formatByteSize(file.size)}). Valid video files must be at least ${formatByteSize(config.minVideoBytes)}. The file may be empty, corrupt, or not a real video file.`,
    );
  }
}

export async function fetchUploadsConfig(
  request: typeof clientRequest = clientRequest,
): Promise<UploadsConfigResponse> {
  if (cachedConfig) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const res = await request("/api/v1/uploads/config");
    if (!res.ok) {
      throw new Error(await readBackendErrorMessage(res, "Failed to load upload config"));
    }
    const json = (await res.json()) as UploadsConfigResponse;
    cachedConfig = json;
    return json;
  })();

  try {
    return await configPromise;
  } finally {
    configPromise = null;
  }
}

function withUploadMetadata(url: string, size: number): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("bytes") && !parsed.searchParams.has("size")) {
      parsed.searchParams.set("bytes", String(Math.round(size)));
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function uploadMediaFile(
  file: File,
  fetchFn: typeof clientFetch,
): Promise<UploadResponse> {
  const config = await fetchUploadsConfig(clientRequest);
  if (!config.enabled) {
    throw new Error("File uploads are not configured on the server.");
  }

  assertClientUploadLimits(file, config);

  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetchFn("/api/v1/uploads", {
    method: "POST",
    body: formData,
  });

  const body = (await res.json()) as UploadResponse;
  if (!body?.url) {
    throw new Error("Upload succeeded but no URL was returned");
  }
  return {
    ...body,
    url: withUploadMetadata(body.url, body.size),
  };
}

/** Upload multiple files sequentially; returns hosted public URLs in order. */
export async function uploadMediaFiles(
  files: File[],
  fetchFn: typeof clientFetch,
): Promise<UploadResponse[]> {
  const results: UploadResponse[] = [];
  for (const file of files) {
    results.push(await uploadMediaFile(file, fetchFn));
  }
  return results;
}
