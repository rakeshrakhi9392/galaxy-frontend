import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clientRequestWithRetry,
  isNetworkFetchError,
} from "./backend";

describe("isNetworkFetchError", () => {
  it("detects Failed to fetch", () => {
    expect(isNetworkFetchError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("ignores HTTP error messages", () => {
    expect(isNetworkFetchError(new Error("Request failed (500)"))).toBe(false);
  });
});

describe("clientRequestWithRetry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries network failures then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const res = await clientRequestWithRetry("/api/v1/test");
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error after retries are exhausted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(clientRequestWithRetry("/api/v1/test", undefined, { maxRetries: 1 })).rejects.toThrow(
      /Could not reach the API after 2 attempts/,
    );
  });

  it("retries transient HTTP statuses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const res = await clientRequestWithRetry("/api/v1/test");
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
