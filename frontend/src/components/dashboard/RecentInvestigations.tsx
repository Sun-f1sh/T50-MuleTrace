"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { InvestigationSummary } from "@shared/types";
import { DETECTION_PATTERN_LABELS } from "@shared/types";
import { RiskDot } from "@/components/ui/StatusDot";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const statusLabel = {
  open: "Open",
  confirmed: "Confirmed",
  cleared: "Cleared",
} as const;

export function RecentInvestigations({
  investigations,
  loading,
}: {
  investigations: InvestigationSummary[] | null;
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Recent investigations</h2>
        <Link
          href="/investigations"
          className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          All cases
        </Link>
      </header>

      {loading ? (
        <div className="divide-y divide-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : !investigations || investigations.length === 0 ? (
        <EmptyState
          title="No investigations yet"
          description="Upload transaction data to start the first investigation."
        />
      ) : (
        <div className="divide-y divide-line">
          {investigations.map((inv) => (
            <Link
              key={inv.id}
              href={`/investigations/${inv.id}`}
              className="group flex items-center gap-3 px-6 py-4 transition-colors hover:bg-subtle"
            >
              <RiskDot level={inv.riskLevel} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-medium text-ink">{inv.caseNumber}</span>
                  <span className="font-mono text-[11px] text-faint">{inv.subjectAccountId}</span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {DETECTION_PATTERN_LABELS[inv.primaryPattern]} · {timeAgo(inv.updatedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    inv.status === "confirmed"
                      ? "text-danger"
                      : inv.status === "cleared"
                        ? "text-positive"
                        : "text-muted",
                  )}
                >
                  {statusLabel[inv.status]}
                </span>
                {inv.auditVerified && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-faint">
                    <ShieldCheck className="h-3 w-3 text-positive" />
                    on-chain
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
