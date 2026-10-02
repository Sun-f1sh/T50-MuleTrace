"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Crosshair,
  Maximize,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import type { Investigation } from "@shared/types";
import { layoutGraph } from "@/lib/utils/graph";
import { AccountNode, type AccountFlowNode } from "./AccountNode";
import { FlowEdge, type TransactionFlowEdge } from "./FlowEdge";
import { cn } from "@/lib/utils/cn";

const nodeTypes: NodeTypes = { account: AccountNode };
const edgeTypes: EdgeTypes = { flow: FlowEdge };

function ControlButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

function GraphInner({
  investigation,
  selectedAccountId,
  selectedTransactionId,
  onSelectAccount,
  onSelectTransaction,
}: {
  investigation: Investigation;
  selectedAccountId: string | null;
  selectedTransactionId: string | null;
  onSelectAccount: (id: string | null) => void;
  onSelectTransaction: (id: string | null) => void;
}) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  const positions = useMemo(
    () => layoutGraph(investigation.graph, investigation.accounts),
    [investigation],
  );
  const positionById = useMemo(
    () => new Map(positions.map((p) => [p.id, p])),
    [positions],
  );
  const accountById = useMemo(
    () => new Map(investigation.accounts.map((a) => [a.id, a])),
    [investigation],
  );

  // Accounts connected to the current selection (kept at full emphasis).
  const relatedIds = useMemo(() => {
    const set = new Set<string>();
    for (const edge of investigation.graph.edges) {
      const involvesSelectedTx =
        selectedTransactionId != null && edge.transactionIds.includes(selectedTransactionId);
      const involvesSelectedAccount = selectedAccountId != null && (edge.source === selectedAccountId || edge.target === selectedAccountId);
      if (involvesSelectedTx || involvesSelectedAccount) {
        set.add(edge.source);
        set.add(edge.target);
      }
    }
    return set;
  }, [investigation, selectedAccountId, selectedTransactionId]);

  const nodes = useMemo<AccountFlowNode[]>(
    () =>
      investigation.graph.nodes.map((n) => {
        const account = accountById.get(n.id)!;
        const pos = n.position ?? positionById.get(n.id) ?? { x: 0, y: 0 };
        const isFocus = n.id === investigation.graph.focusAccountId;
        const isSelected = n.id === selectedAccountId;
        const dimmed =
          (selectedAccountId != null || selectedTransactionId != null) &&
          !isSelected &&
          !relatedIds.has(n.id);
        return {
          id: n.id,
          type: "account" as const,
          position: { x: pos.x, y: pos.y },
          selected: isSelected,
          data: { account, isFocus, dimmed },
        };
      }),
    [investigation, accountById, positionById, selectedAccountId, selectedTransactionId, relatedIds],
  );

  const edges = useMemo<TransactionFlowEdge[]>(
    () =>
      investigation.graph.edges.map((e) => {
        const txSelected = selectedTransactionId != null && e.transactionIds.includes(selectedTransactionId);
        const touchesSelection =
          selectedAccountId != null && (e.source === selectedAccountId || e.target === selectedAccountId);
        const highlighted = txSelected || touchesSelection;
        const dimmed =
          (selectedTransactionId != null || selectedAccountId != null) && !highlighted;
        const isCircular = investigation.transactions.some(
          (t) => t.id === e.transactionIds[0] && t.signals.includes("circular"),
        );
        return {
          id: e.id,
          type: "flow" as const,
          source: e.source,
          target: e.target,
          data: {
            transactionId: e.transactionIds[0],
            amount: e.totalAmount,
            currency: investigation.currency,
            isCircular,
            dimmed,
            highlighted,
          },
        };
      }),
    [investigation, selectedAccountId, selectedTransactionId],
  );

  const focusSubject = () => {
    const pos = positionById.get(investigation.graph.focusAccountId);
    if (pos) {
      setCenter(pos.x + 112, pos.y + 48, { zoom: 1.05, duration: 550 });
    }
    onSelectAccount(investigation.graph.focusAccountId);
  };

  const clearSelection = () => {
    onSelectAccount(null);
    onSelectTransaction(null);
    fitView({ duration: 450, padding: 0.15, maxZoom: 1 });
  };

  return (
    <div className="relative h-[480px] w-full lg:h-[540px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={1.75}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable
        onNodeClick={(_, node) => onSelectAccount(node.id === selectedAccountId ? null : node.id)}
        onEdgeClick={(_, edge) =>
          onSelectTransaction(
            edge.data?.transactionId === selectedTransactionId ? null : edge.data?.transactionId ?? null,
          )
        }
        proOptions={{ hideAttribution: true }}
      >
        {/* Kept intentionally clean: no background pattern, no minimap. */}
      </ReactFlow>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-between px-3">
        <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-line bg-surface/90 px-3 py-2 backdrop-blur-sm">
          {[
            ["Low", "var(--faint)"],
            ["Medium", "var(--tone-warn)"],
            ["High", "var(--tone-danger)"],
            ["Circular", "var(--tone-danger)"],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</span>
            </span>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <ControlButton onClick={focusSubject} label="Focus subject account">
            <Crosshair className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton onClick={() => zoomIn({ duration: 200 })} label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton onClick={() => zoomOut({ duration: 200 })} label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton
            onClick={() => fitView({ duration: 450, padding: 0.18, maxZoom: 1 })}
            label="Fit view"
          >
            <Maximize className="h-3.5 w-3.5" />
          </ControlButton>
          {(selectedAccountId || selectedTransactionId) && (
            <ControlButton onClick={clearSelection} label="Clear selection">
              <X className="h-3.5 w-3.5" />
            </ControlButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function InvestigationGraph(props: React.ComponentProps<typeof GraphInner>) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
