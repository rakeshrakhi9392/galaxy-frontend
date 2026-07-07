import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithEtag, invalidateHttpCache } from "./httpCache";

describe("fetchJsonWithEtag", () => {
  beforeEach(() => {
    invalidateHttpCache();
  });

  it("caches a 200 body and returns it on 304", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 1 }), {
          status: 200,
          headers: { ETag: '"v1"' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '"v1"' } }));

    const parse = (data: unknown) => data as { value: number };

    const first = await fetchJsonWithEtag("/api/v1/doc", parse, request);
    const second = await fetchJsonWithEtag("/api/v1/doc", parse, request);

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(request).toHaveBeenNthCalledWith(2, "/api/v1/doc", {
      headers: { "If-None-Match": '"v1"' },
    });
  });

  it("throws when 304 arrives without a cached body", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(null, { status: 304, headers: { ETag: '"v1"' } }),
    );

    await expect(
      fetchJsonWithEtag("/api/v1/missing", (data) => data, request),
    ).rejects.toThrow(/304/);
  });
});
