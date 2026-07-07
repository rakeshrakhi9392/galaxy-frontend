import type { NodeTypes } from "reactflow";
import { nodeDefinitions } from "@/generated/nodeRegistry";
import { SchemaDrivenNode } from "./nodes/SchemaDrivenNode";

/**
 * Every registered node type renders from build-time `nodeRegistry` config
 * via a single schema-driven component (`ui.body` selects the body layout).
 */
export const workflowNodeTypes: NodeTypes = Object.fromEntries(
  nodeDefinitions.map((definition) => [definition.type, SchemaDrivenNode]),
);
