import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import { graphContainsCycle } from "./graphUtils";

function node(id: string): Node {
  return { id, type: "llm", position: { x: 0, y: 0 }, data: {} };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe("graphContainsCycle", () => {
  it("returns false for an acyclic graph", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a-b", "a", "b"), edge("b-c", "b", "c")];
    expect(graphContainsCycle(nodes, edges)).toBe(false);
  });

  it("returns true when the stored graph contains a cycle", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a-b", "a", "b"), edge("b-c", "b", "c"), edge("c-b", "c", "b")];
    expect(graphContainsCycle(nodes, edges)).toBe(true);
  });
});
