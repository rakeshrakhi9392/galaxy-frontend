import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import {
  computeAddToRequest,
  handleDataTypeToRequestFieldType,
  uniqueFieldName,
} from "./addToRequest";

function makeNode(id: string, type: string, data?: Record<string, unknown>, x = 0, y = 0): Node {
  return {
    id,
    type,
    position: { x, y },
    data: data ?? {},
  };
}

describe("handleDataTypeToRequestFieldType", () => {
  it("maps list types to singular media field types", () => {
    expect(handleDataTypeToRequestFieldType("image_list")).toBe("image");
    expect(handleDataTypeToRequestFieldType("video_list")).toBe("video");
    expect(handleDataTypeToRequestFieldType("audio_list")).toBe("audio");
  });
});

describe("uniqueFieldName", () => {
  it("deduplicates field names", () => {
    expect(uniqueFieldName("Prompt", ["Prompt"])).toBe("Prompt 2");
    expect(uniqueFieldName("Prompt", ["Prompt", "Prompt 2"])).toBe("Prompt 3");
  });
});

describe("computeAddToRequest", () => {
  const llm = makeNode("llm1", "llm", {}, 500, 200);
  const request = makeNode("req1", "request", {
    dynamicFields: [{ id: "f1", name: "Input", type: "text", value: "" }],
  });

  it("adds an image field and edge from request to llm image input", () => {
    const result = computeAddToRequest({
      nodes: [request, llm],
      edges: [],
      targetNodeId: "llm1",
      targetHandleId: "in:image_urls",
      createNodeId: () => "node_new",
      createFieldId: () => "field_image",
      createEdgeId: () => "edge_new",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updatedRequest = result.nodes.find((node) => node.id === "req1");
    const fields = (updatedRequest?.data as { dynamicFields: Array<{ type: string; name: string }> })
      .dynamicFields;
    expect(fields).toHaveLength(2);
    expect(fields[1]).toMatchObject({ id: "field_image", type: "image", name: "Image (Vision)" });

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({
      source: "req1",
      target: "llm1",
      sourceHandle: "field_image",
      targetHandle: "in:image_urls",
    });
  });

  it("creates a request node when missing", () => {
    const result = computeAddToRequest({
      nodes: [llm],
      edges: [],
      targetNodeId: "llm1",
      targetHandleId: "in:prompt",
      createNodeId: () => "req_new",
      createFieldId: () => "field_prompt",
      createEdgeId: () => "edge_new",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const created = result.nodes.find((node) => node.id === "req_new");
    expect(created?.type).toBe("request");
    expect(created?.position).toEqual({ x: 80, y: 200 });
    expect(result.edges[0]?.source).toBe("req_new");
  });

  it("replaces an existing edge on the same target handle", () => {
    const edges: Edge[] = [
      {
        id: "old",
        source: "req1",
        target: "llm1",
        sourceHandle: "f1",
        targetHandle: "in:prompt",
      },
    ];
    const result = computeAddToRequest({
      nodes: [request, llm],
      edges,
      targetNodeId: "llm1",
      targetHandleId: "in:prompt",
      createNodeId: () => "node_new",
      createFieldId: () => "field_prompt",
      createEdgeId: () => "edge_new",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.id).toBe("edge_new");
    expect(result.edges[0]?.sourceHandle).toBe("field_prompt");
  });
});
