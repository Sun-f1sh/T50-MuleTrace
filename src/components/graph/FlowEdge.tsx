"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { formatCurrency } from "@/lib/utils/format";

export type FlowEdgeData = {
  transactionId: string;
  amount: number;
  currency: string;
  isCircular: boolean;
  dimmed: boolean;
  highlighted: boolean;
};

export type TransactionFlowEdge = Edge<FlowEdgeData, "flow">;

export const FlowEdge = memo(function FlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<TransactionFlowEdge>) {
  const [hovered, setHovered] = useState(false);
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });

  const highlighted = data?.highlighted || selected;
  const showLabel = hovered || highlighted;

  return (
    <>
      <BaseEdge
        id={undefined}
        path={path}
        style={{
          stroke: data?.isCircular
            ? "var(--tone-danger)"
            : highlighted
              ? "var(--mint)"
              : "var(--line-strong)",
          strokeWidth: highlighted ? 1.8 : 1.1,
          opacity: data?.dimmed ? 0.22 : 1,
          transition: "stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease",
        }}
      />
      <path
        d={path}
        fill="none"
        strokeWidth={16}
        stroke="transparent"
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {showLabel && !data?.dimmed && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink tnum"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {formatCurrency(data?.amount ?? 0, data?.currency ?? "units")}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
