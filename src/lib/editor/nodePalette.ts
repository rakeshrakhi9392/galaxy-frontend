import type { LucideIcon } from "lucide-react";
import { Combine, Image, Layers, Music, Video } from "lucide-react";

/** Hackathon-required node types only — match `.cursor/rules/requirements` §5. */
export const REQUIRED_PALETTE_NODE_TYPES = [
  "gpt-image-2",
  "kling-v3-pro",
  "llm",
  "merge-video",
  "merge-av",
  "extract-audio",
  "request",
  "response",
] as const;

export type PaletteNodeType = (typeof REQUIRED_PALETTE_NODE_TYPES)[number];

export type PaletteLeaf = {
  type: PaletteNodeType;
  label: string;
  icon?: LucideIcon;
};

export type PaletteGroup = {
  id: string;
  label: string;
  nodes: PaletteLeaf[];
};

export type PaletteCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  groups: PaletteGroup[];
};

export const NODE_PALETTE: PaletteCategory[] = [
  {
    id: "image",
    label: "Image",
    icon: Image,
    groups: [
      {
        id: "generate-image",
        label: "Generate Image",
        nodes: [{ type: "gpt-image-2", label: "GPT Image 2" }],
      },
    ],
  },
  {
    id: "video",
    label: "Video",
    icon: Video,
    groups: [
      {
        id: "generate-video",
        label: "Generate Video",
        nodes: [{ type: "kling-v3-pro", label: "Kling v3 Pro" }],
      },
    ],
  },
  {
    id: "others",
    label: "Others",
    icon: Layers,
    groups: [
      {
        id: "input",
        label: "Input",
        nodes: [
          { type: "request", label: "Request-Inputs" },
          { type: "response", label: "Response" },
        ],
      },
      {
        id: "utility",
        label: "Utility",
        nodes: [
          { type: "merge-video", label: "Merge Videos" },
          { type: "merge-av", label: "Merge Audio & Video", icon: Combine },
          { type: "extract-audio", label: "Extract Audio", icon: Music },
        ],
      },
      {
        id: "llm-call",
        label: "LLM Call",
        nodes: [{ type: "llm", label: "Gemini Flash Latest" }],
      },
    ],
  },
];

export type PaletteLeafEntry = PaletteLeaf & {
  groupId: string;
  groupLabel: string;
  categoryId: string;
  categoryLabel: string;
};

export function listPaletteLeaves(registeredTypes: ReadonlySet<string>): PaletteLeafEntry[] {
  const leaves: PaletteLeafEntry[] = [];
  for (const category of NODE_PALETTE) {
    for (const group of category.groups) {
      for (const node of group.nodes) {
        if (!registeredTypes.has(node.type)) continue;
        leaves.push({
          ...node,
          groupId: group.id,
          groupLabel: group.label,
          categoryId: category.id,
          categoryLabel: category.label,
        });
      }
    }
  }
  return leaves;
}

export function getPaletteLeafIcon(type: string): LucideIcon {
  for (const category of NODE_PALETTE) {
    for (const group of category.groups) {
      const node = group.nodes.find((n) => n.type === type);
      if (node?.icon) return node.icon;
    }
  }
  return Layers;
}

export function filterPaletteLeaves(
  leaves: PaletteLeafEntry[],
  query: string,
): PaletteLeafEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return leaves;
  return leaves.filter(
    (leaf) =>
      leaf.label.toLowerCase().includes(q) ||
      leaf.groupLabel.toLowerCase().includes(q) ||
      leaf.categoryLabel.toLowerCase().includes(q),
  );
}

export function visiblePaletteCategories(
  registeredTypes: ReadonlySet<string>,
  query: string,
): PaletteCategory[] {
  const leaves = filterPaletteLeaves(listPaletteLeaves(registeredTypes), query);
  const visibleTypes = new Set(leaves.map((l) => l.type));

  return NODE_PALETTE.map((category) => ({
    ...category,
    groups: category.groups
      .map((group) => ({
        ...group,
        nodes: group.nodes.filter((n) => visibleTypes.has(n.type)),
      }))
      .filter((group) => group.nodes.length > 0),
  })).filter((category) => category.groups.length > 0);
}
