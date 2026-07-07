import { describe, expect, it } from "vitest";
import {
  extractResponseResults,
  resolveResponseFieldValue,
} from "./responseResults";

describe("responseResults", () => {
  it("extracts nested results from response node output", () => {
    expect(
      extractResponseResults({
        results: { llm: "hello", image: { url: "https://example.com/a.png" } },
      }),
    ).toEqual({
      llm: "hello",
      image: { url: "https://example.com/a.png" },
    });
  });

  it("resolves field values by binding name", () => {
    const binding = {
      edgeId: "e1",
      sourceNodeId: "a",
      sourceHandle: "out:output",
      name: "llm",
    };
    expect(
      resolveResponseFieldValue({ llm: "done" }, binding, 0),
    ).toBe("done");
  });
});
