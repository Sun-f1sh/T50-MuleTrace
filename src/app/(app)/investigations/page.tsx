"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { InvestigationRow, InvestigationRowsSkeleton } from "@/components/investigation/InvestigationListRow";
import { useAsync } from "@/hooks/useAsync";
import { getInvestigations } from "@/lib/api";
import type { InvestigationStatus } from "@shared/types";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "all" | InvestigationStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cleared", label: "Cleared" },
];

export default function InvestigationsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useAsync(() => getInvestigations(), []);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((i) => i.status === filter);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((i) => i.caseNumber.includes(q) || i.subjectAccountId.includes(q));
    return list;
  }, [data, filter, query]);

  return (
    <>
      <PageHeader
        title="Investigations"
        description="Every case raised from transaction data, with its current status and audit state."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-line p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                filter === f.value ? "bg-celery-wash text-ink" : "text-muted hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search case or account"
          className="ml-auto h-9 w-56 rounded-full border border-line bg-surface px-4 text-[13px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
        {loading ? (
          <InvestigationRowsSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No investigations match"
            description="Adjust the filters or import new transaction data to raise cases."
          />
        ) : (
          <>
            <div className="hidden grid-cols-[0.9fr_1.1fr_0.5fr_1fr_0.7fr_0.8fr_0.6fr] gap-4 border-b border-line px-6 py-2.5 lg:grid">
              {["Case", "Account", "Risk", "Primary signal", "Volume", "Status", "Updated"].map((h) => (
                <span key={h} className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  {h}
                </span>
              ))}
            </div>
            <div className="divide-y divide-line">
              {filtered.map((inv) => (
                <InvestigationRow key={inv.id} inv={inv} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
