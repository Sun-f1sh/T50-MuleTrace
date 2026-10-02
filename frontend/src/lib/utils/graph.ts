import type { Account, InvestigationGraph } from "@shared/types";

/**
 * Layered left-to-right layout for an investigation graph:
 * sources (left) → subject (center) → destinations (right).
 * Deterministic so server and client agree, and stable across renders.
 */
export function layoutGraph(
  graph: InvestigationGraph,
  accounts: Account[],
): { id: string; x: number; y: number }[] {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const sources = graph.nodes.filter((n) => {
    const role = accountById.get(n.id)?.role;
    return n.id !== graph.focusAccountId && role !== "destination";
  });
  const destinations = graph.nodes.filter(
    (n) => n.id !== graph.focusAccountId && accountById.get(n.id)?.role === "destination",
  );

  const NODE_W = 228;
  const NODE_H = 96;
  const GAP_X = 220;
  const GAP_Y = 116;

  const columns: { x: number; nodes: typeof graph.nodes }[] = [
    { x: 0, nodes: sources },
    { x: NODE_W + GAP_X, nodes: graph.nodes.filter((n) => n.id === graph.focusAccountId) },
    { x: (NODE_W + GAP_X) * 2, nodes: destinations },
  ];

  const positions: { id: string; x: number; y: number }[] = [];
  for (const col of columns) {
    const height = Math.max(0, col.nodes.length * NODE_H + (col.nodes.length - 1) * (GAP_Y - NODE_H + 20));
    col.nodes.forEach((node, i) => {
      positions.push({
        id: node.id,
        x: col.x,
        y: -height / 2 + i * GAP_Y + (NODE_H - GAP_Y + 20) / 2,
      });
    });
  }
  return positions;
}
