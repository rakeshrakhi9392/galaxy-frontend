import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import {
  formatNodeValidationIssues,
  validateNodeInputs,
  validateNodeOutput,
  validateNodesForRun,
} from "./validateNodeInputs";

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

describe("validateNodeInputs", () => {
  it("accepts valid gpt-image-2 defaults", () => {
    expect(validateNodeInputs(node("a", "gpt-image-2"))).toEqual([]);
  });

  it("rejects invalid merge-av urls", () => {
    const issues = validateNodeInputs(
      node("m", "merge-av", {
        video_url: "not-a-url",
        audio_url: "also-bad",
      }),
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.nodeId).toBe("m");
  });

  it("validates wired request prompt against llm schema", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [{ id: "field_1", name: "Prompt", type: "text", value: "hello world" }],
      }),
      node("llm", "llm", { prompt: "" }),
    ];
    const edges = [edge("e1", "req", "llm", "field_1", "in:prompt")];

    expect(validateNodeInputs(nodes[1]!, { nodes, edges })).toEqual([]);
  });

  it("rejects wired invalid merge-av urls from request fields", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [
          { id: "field_video", name: "Video", type: "video", value: "not-a-url" },
          { id: "field_audio", name: "Audio", type: "audio", value: "also-bad" },
        ],
      }),
      node("merge", "merge-av", { video_url: "", audio_url: "" }),
    ];
    const edges = [
      edge("e1", "req", "merge", "field_video", "in:video_url"),
      edge("e2", "req", "merge", "field_audio", "in:audio_url"),
    ];

    const issues = validateNodeInputs(nodes[1]!, { nodes, edges });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("validates only selected nodes for a partial run", () => {
    const nodes = [
      node("ok", "llm", { prompt: "hello" }),
      node("bad", "merge-av", { video_url: "x", audio_url: "y" }),
    ];
    expect(validateNodesForRun(nodes, ["ok"])).toEqual([]);
    expect(validateNodesForRun(nodes, ["bad"]).length).toBeGreaterThan(0);
    // Orphan nodes are outside the full-run closure from Request Inputs.
    expect(validateNodesForRun(nodes)).toEqual([]);
  });

  it("accepts gpt-image-2 prompt wired from request for run validation", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [{ id: "field_prompt", name: "prompt", type: "text", value: "a red car" }],
      }),
      node("img", "gpt-image-2", { mode: "text_to_image", prompt: "" }),
    ];
    const edges = [edge("e1", "req", "img", "field_prompt", "in:prompt")];

    expect(validateNodesForRun(nodes, ["img"], edges)).toEqual([]);
  });

  it("full run ignores orphan gpt-image-2 nodes not downstream from request", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [{ id: "field_prompt", name: "prompt", type: "text", value: "a red car" }],
      }),
      node("img", "gpt-image-2", { mode: "text_to_image", prompt: "" }),
      node("orphan", "gpt-image-2", { mode: "text_to_image", prompt: "" }),
    ];
    const edges = [edge("e1", "req", "img", "field_prompt", "in:prompt")];

    expect(validateNodesForRun(nodes, undefined, edges)).toEqual([]);
  });

  it("does not require input images for text-to-image on full run", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [{ id: "field_prompt", name: "prompt", type: "text", value: "sunset" }],
      }),
      node("img", "gpt-image-2", { mode: "text_to_image", prompt: "" }),
    ];
    const edges = [edge("e1", "req", "img", "field_prompt", "in:prompt")];

    expect(validateNodesForRun(nodes, undefined, edges)).toEqual([]);
  });

  it("rejects request nodes without dynamic fields", () => {
    const issues = validateNodeInputs(node("req", "request", {}, { dynamicFields: [] }));
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects invalid cached node output", () => {
    const issues = validateNodeOutput(
      node(
        "m",
        "merge-av",
        {},
        { lastOutput: { video_url: "not-a-url" } },
      ),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it("validates cached output when schema matches", () => {
    const issues = validateNodeOutput(
      node(
        "m",
        "merge-av",
        {},
        {
          lastOutput: {
            video_url: "https://example.com/v.mp4",
          },
        },
      ),
    );
    expect(issues).toEqual([]);
  });

  it("does not validate stale lastOutput during validateNodesForRun", () => {
    const nodes = [
      node(
        "bad",
        "merge-av",
        { video_url: "https://example.com/v.mp4", audio_url: "https://example.com/a.mp3" },
        { lastOutput: { video_url: "not-a-url" } },
      ),
    ];
    expect(validateNodesForRun(nodes)).toEqual([]);
  });

  it("accepts kling to extract-audio to merge-av without prior lastOutput", () => {
    const nodes = [
      node("req", "request", {}, {
        dynamicFields: [{ id: "field_1", name: "prompt", type: "text", value: "a cat walking" }],
      }),
      node("kling", "kling-v3-pro", { mode: "text_to_video", prompt: "" }),
      node("extract", "extract-audio", { video_url: "" }),
      node("merge", "merge-av", { video_url: "", audio_url: "" }),
    ];
    const edges = [
      edge("e1", "req", "kling", "field_1", "in:prompt"),
      edge("e2", "kling", "extract", "out:result", "in:video_url"),
      edge("e3", "kling", "merge", "out:result", "in:video_url"),
      edge("e4", "extract", "merge", "out:audio_url", "in:audio_url"),
    ];

    expect(validateNodesForRun(nodes, undefined, edges)).toEqual([]);
  });

  it("formats issues for the editor banner", () => {
    const labeled: Node = {
      id: "m",
      type: "merge-av",
      position: { x: 0, y: 0 },
      data: {
        label: "Merge Audio & Video",
        inputs: { video_url: "bad", audio_url: "bad" },
      },
    };
    const issues = validateNodeInputs(labeled);
    const message = formatNodeValidationIssues(issues);
    expect(issues.length).toBeGreaterThan(0);
    expect(message).toContain("Merge Audio & Video");
  });
});
