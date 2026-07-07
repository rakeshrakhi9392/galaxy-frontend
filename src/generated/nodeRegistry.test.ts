import { describe, expect, it } from "vitest";
import {
  getNodeDefinition,
  getNodeInputSchema,
  getNodeOutputSchema,
  listNodeTypes,
  nodeDefinitions,
  nodeRegistryByType,
  NODE_INPUT_SCHEMAS,
  NODE_OUTPUT_SCHEMAS,
} from "@/generated/nodeRegistry";

describe("nodeRegistry", () => {
  it("exposes input and output schemas for every registered node type", () => {
    for (const definition of nodeDefinitions) {
      expect(getNodeInputSchema(definition.type)).toBe(NODE_INPUT_SCHEMAS[definition.type]);
      expect(getNodeOutputSchema(definition.type)).toBe(NODE_OUTPUT_SCHEMAS[definition.type]);
      expect(getNodeDefinition(definition.type)?.input).toBeDefined();
      expect(getNodeDefinition(definition.type)?.output).toBeDefined();
    }
  });

  it("builds nodeRegistryByType with schemas attached", () => {
    expect(Object.keys(nodeRegistryByType).sort()).toEqual(listNodeTypes().sort());
    for (const type of listNodeTypes()) {
      const definition = nodeRegistryByType[type];
      expect(definition?.type).toBe(type);
      expect(definition?.ui.title.length).toBeGreaterThan(0);
      expect(definition?.input.safeParse).toBeTypeOf("function");
      expect(definition?.output.safeParse).toBeTypeOf("function");
    }
  });
});
