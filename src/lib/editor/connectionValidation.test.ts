import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import { isValidWorkflowConnection } from "./connectionValidation";

function makeNode(id: string, type: string, data?: Record<string, unknown>): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: data ?? {},
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle };
}

describe("isValidWorkflowConnection", () => {
  const llm = makeNode("llm1", "llm");
  const response = makeNode("res1", "response");
  const request = makeNode("req1", "request", { dynamicFields: [{ id: "f1", name: "q", type: "text" }] });

  it("allows llm output to response result", () => {
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "res1", sourceHandle: "out:output", targetHandle: "result" },
      [llm, response],
      [],
    );
    expect(result.valid).toBe(true);
  });

  it("blocks self-connection", () => {
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "llm1", sourceHandle: "out:result", targetHandle: "in:prompt" },
      [llm],
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/itself/i);
  });

  it("blocks connection into request node", () => {
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "req1", sourceHandle: "out:result", targetHandle: "f1" },
      [llm, request],
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/request/i);
  });

  it("blocks connection out of response node", () => {
    const result = isValidWorkflowConnection(
      { source: "res1", target: "llm1", sourceHandle: "result", targetHandle: "in:prompt" },
      [response, llm],
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/response/i);
  });

  it("blocks cycles", () => {
    const n2 = makeNode("llm2", "llm");
    const edges = [makeEdge("e1", "llm1", "llm2", "out:output", "in:prompt")];
    const result = isValidWorkflowConnection(
      { source: "llm2", target: "llm1", sourceHandle: "out:output", targetHandle: "in:prompt" },
      [llm, n2],
      edges,
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/cycle/i);
  });

  it("blocks duplicate prompt input", () => {
    const n2 = makeNode("llm2", "llm");
    const n3 = makeNode("llm3", "llm");
    const edges = [makeEdge("e1", "llm2", "llm3", "out:output", "in:prompt")];
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "llm3", sourceHandle: "out:output", targetHandle: "in:prompt" },
      [llm, n2, n3],
      edges,
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/already has a connection/i);
  });

  it("allows multiple edges into settings handles", () => {
    const n2 = makeNode("llm2", "llm");
    const n3 = makeNode("llm3", "llm");
    const edges = [makeEdge("e1", "llm2", "llm3", "out:output", "in:temperature")];
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "llm3", sourceHandle: "out:output", targetHandle: "in:temperature" },
      [llm, n2, n3],
      edges,
    );
    expect(result.valid).toBe(true);
  });

  it("blocks duplicate text inputs such as stop sequences", () => {
    const n2 = makeNode("llm2", "llm");
    const n3 = makeNode("llm3", "llm");
    const edges = [makeEdge("e1", "llm2", "llm3", "out:output", "in:stop")];
    const result = isValidWorkflowConnection(
      { source: "llm1", target: "llm3", sourceHandle: "out:output", targetHandle: "in:stop" },
      [llm, n2, n3],
      edges,
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/already has a connection/i);
  });

  it("allows multiple edges into media handles", () => {
    const req2 = makeNode("req2", "request", {
      dynamicFields: [{ id: "f2", name: "img", type: "image" }],
    });
    const edges = [makeEdge("e1", "req1", "llm1", "f1", "in:image_urls")];
    // f1 is text — incompatible. Use image fields.
    const reqImg1 = makeNode("reqImg1", "request", {
      dynamicFields: [{ id: "img1", name: "a", type: "image" }],
    });
    const reqImg2 = makeNode("reqImg2", "request", {
      dynamicFields: [{ id: "img2", name: "b", type: "image" }],
    });
    const mediaEdges = [makeEdge("e1", "reqImg1", "llm1", "img1", "in:image_urls")];
    const result = isValidWorkflowConnection(
      { source: "reqImg2", target: "llm1", sourceHandle: "img2", targetHandle: "in:image_urls" },
      [llm, req2, reqImg1, reqImg2],
      mediaEdges,
    );
    expect(result.valid).toBe(true);
  });

  it("allows request dynamic field as source", () => {
    const result = isValidWorkflowConnection(
      { source: "req1", target: "llm1", sourceHandle: "f1", targetHandle: "in:prompt" },
      [request, llm],
      [],
    );
    expect(result.valid).toBe(true);
  });

  it("blocks incompatible handle types", () => {
    const gpt = makeNode("gpt1", "gpt-image-2");
    const llmTarget = makeNode("llm2", "llm");
    const result = isValidWorkflowConnection(
      { source: "gpt1", target: "llm2", sourceHandle: "out:result", targetHandle: "in:prompt" },
      [gpt, llmTarget],
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/incompatible/i);
  });

  it("allows image_list outputs into kling image inputs", () => {
    const gpt = makeNode("gpt1", "gpt-image-2");
    const kling = makeNode("kling1", "kling-v3-pro");
    const start = isValidWorkflowConnection(
      {
        source: "gpt1",
        target: "kling1",
        sourceHandle: "out:result",
        targetHandle: "in:start_image_url",
      },
      [gpt, kling],
      [],
    );
    expect(start.valid).toBe(true);

    const frontal = isValidWorkflowConnection(
      {
        source: "gpt1",
        target: "kling1",
        sourceHandle: "out:result",
        targetHandle: "in:elements.0.frontal_image_url",
      },
      [gpt, kling],
      [],
    );
    expect(frontal.valid).toBe(true);
  });
});
