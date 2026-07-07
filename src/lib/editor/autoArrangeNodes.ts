import type { Edge, Node } from "reactflow";

const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 80;
const START_X = 160;
const START_Y = 240;

export function topoSortNodes(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (order.length < nodes.length) {
    return [...nodes].sort((a, b) => a.position.x - b.position.x);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => byId.get(id)!);
}

export function autoArrangeNodes(nodes: Node[], edges: Edge[]): Node[] {
  const sorted = topoSortNodes(nodes, edges);
  return sorted.map((node, index) => ({
    ...node,
    position: {
      x: START_X + index * (380 + HORIZONTAL_GAP),
      y: START_Y + (index % 2) * VERTICAL_GAP,
    },
  }));
}
