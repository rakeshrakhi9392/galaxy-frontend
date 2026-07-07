import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import { validateProviderLimitsFromHintsForNode } from "./validateProviderLimits";

function node(
  id: string,
  type: string,
  inputs: Record<string, unknown> = {},
  data: Record<string, unknown> = {},
): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { inputs, ...data },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle };
}

describe("validateProviderLimitsFromHintsForNode", () => {
  it("flags blob image urls on gpt-image-2", () => {
    const issues = validateProviderLimitsFromHintsForNode(
      node("g1", "gpt-image-2", {
        mode: "image_to_image",
        prompt: "edit",
        image: "blob:http://localhost/abc",
        size: "1024x1024",
        quality: "high",
        n: 1,
        output_format: "png",
        background: "auto",
      }),
    );
    expect(issues.some((issue) => issue.message.includes("blob"))).toBe(true);
  });

  it("ignores non-limit node types", () => {
    expect(validateProviderLimitsFromHintsForNode(node("r1", "request"))).toEqual([]);
  });

  it("allows merge-video with two wired upstream videos before run", () => {
    const nodes = [
      node("kling1", "kling-v3-pro"),
      node("kling2", "kling-v3-pro"),
      node("merge", "merge-video", { video_urls: [], transition: "none" }),
    ];
    const edges = [
      edge("e1", "kling1", "merge", "out:video_url", "in:video_urls"),
      edge("e2", "kling2", "merge", "out:video_url", "in:video_urls"),
    ];

    expect(validateProviderLimitsFromHintsForNode(nodes[2]!, { nodes, edges })).toEqual([]);
  });
});
