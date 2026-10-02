"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Investigation, Transaction } from "@shared/types";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const signalTone: Record<string, string> = {
  "fan-in": "text-info",
  "fan-out": "text-warn",
  circular: "text-danger",
  "rapid-inflow-outflow": "text-warn",
};

export function TransactionTimeline({
  investigation,
  selectedAccountId,
  selectedTransactionId,
  onSelectTransaction,
}: {
  investigation: Investigation;
  selectedAccountId: string | null;
  selectedTransactionId: string | null;
  onSelectTransaction: (id: string | null) => void;
}) {
  const subjectId = investigation.graph.focusAccountId;
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const sorted = useMemo(
    () =>
      investigation.transactions
        .slice()
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [investigation],
  );

  const visible = useMemo(() => {
    if (!selectedAccountId) return sorted;
    return sorted.filter(
      (t) => t.sourceAccountId === selectedAccountId || t.targetAccountId === selectedAccountId,
    );
  }, [sorted, selectedAccountId]);

  // Bring the selected row into view when selection comes from the graph.
  useEffect(() => {
    if (!selectedTransactionId) return;
    rowRefs.current.get(selectedTransactionId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedTransactionId]);

  const row = (tx: Transaction) => {
    const incoming = tx.targetAccountId === subjectId;
    const selected = tx.id === selectedTransactionId;
    return (
      <button
        key={tx.id}
        ref={(el) => {
          if (el) rowRefs.current.set(tx.id, el);
          else rowRefs.current.delete(tx.id);
        }}
        onClick={() => onSelectTransaction(selected ? null : tx.id)}
        className={cn(
          "grid w-full grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 border-l-2 px-5 py-3 text-left transition-colors sm:grid-cols-[84px_20px_1fr_auto] lg:grid-cols-[92px_20px_minmax(0,1fr)_auto_auto]",
          selected
            ? "border-mint bg-celery-wash"
            : "border-transparent hover:bg-subtle",
        )}
      >
        <span className="font-mono text-[11px] text-faint tnum">{formatDateTime(tx.timestamp)}</span>
        {incoming ? (
          <ArrowDownLeft className="h-3.5 w-3.5 text-faint" />
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5 text-faint" />
        )}
        <span className="truncate font-mono text-[12px] text-muted">
          {tx.sourceAccountId} <span className="text-faint">→</span> {tx.targetAccountId}
        </span>
        <span className="col-span-2 font-mono text-[12px] font-medium text-ink tnum sm:col-span-1 lg:order-3">
          {formatCurrency(tx.amount, tx.currency)}
        </span>
        <span className="col-span-2 flex items-center gap-2 sm:col-span-1 lg:order-4 lg:justify-end">
          {tx.signals.map((s) => (
            <span
              key={s}
              className={cn(
                "font-mono text-[9px] uppercase tracking-[0.12em]",
                signalTone[s] ?? "text-faint",
              )}
            >
              {s.replace(/-/g, " ")}
            </span>
          ))}
        </span>
      </button>
    );
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Transaction timeline</h2>
          <span className="font-mono text-xs text-faint tnum">
            {visible.length} of {investigation.totalTransactionCount ?? sorted.length}
          </span>
        </div>
        {investigation.evidenceTruncated && <span className="font-mono text-[10px] uppercase tracking-wide text-warn">Showing first 100 transactions</span>}
        {selectedAccountId && (
          <button
            onClick={() => onSelectTransaction(null)}
            className="inline-flex items-center gap-2 rounded-full bg-celery-wash px-3 py-1 font-mono text-[11px] text-ink transition-colors hover:bg-celery"
          >
            Filtered: {selectedAccountId} · show all
          </button>
        )}
      </header>

      {visible.length === 0 ? (
        <EmptyState
          title="No transactions in view"
          description="Clear the account filter to see the full chronology."
        />
      ) : (
        <div ref={scrollRef} className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {visible.map(row)}
        </div>
      )}
    </section>
  );
}
