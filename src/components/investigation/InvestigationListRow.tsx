"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { InvestigationStatus, InvestigationSummary } from "@shared/types";
import { DETECTION_PATTERN_LABELS } from "@shared/types";
import { RiskDot } from "@/components/ui/StatusDot";
import { Skeleton } from "@/components/ui/states";
import { formatCurrency, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const statusStyles: Record<InvestigationStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "text-celery" },
  confirmed: { label: "Confirmed", className: "text-danger" },
  cleared: { label: "Cleared", className: "text-positive" },
};

export function InvestigationRow({ inv }: { inv: InvestigationSummary }) {
  const status = statusStyles[inv.status];
  return (
    <Link
      href={`/investigations/${inv.id}`}
      className="group grid grid-cols-2 items-center gap-x-4 gap-y-1 px-6 py-4 transition-colors hover:bg-subtle lg:grid-cols-[0.9fr_1.1fr_0.5fr_1fr_0.7fr_0.8fr_0.6fr]"
    >
      <span className="font-mono text-[13px] font-medium text-ink">{inv.caseNumber}</span>
      <span className="hidden font-mono text-[13px] text-muted lg:block">{inv.subjectAccountId}</span>
      <span className="flex items-center gap-2 lg:contents">
        <RiskDot level={inv.riskLevel} className="lg:hidden" />
        <span className="font-mono text-[13px] font-semibold text-ink tnum">{inv.riskScore}</span>
      </span>
      <span className="hidden text-[13px] text-muted lg:block">
        {DETECTION_PATTERN_LABELS[inv.primaryPattern]}
      </span>
      <span className="hidden text-right font-mono text-[13px] text-muted tnum lg:block">
        {formatCurrency(inv.flaggedVolume, inv.currency, { compact: true })}
      </span>
      <span className={cn("text-[13px] font-semibold lg:text-left", status.className)}>
        {status.label}
      </span>
      <span className="flex items-center justify-end gap-2 text-right font-mono text-xs text-faint">
        {inv.auditVerified && <ShieldCheck className="h-3.5 w-3.5 text-positive" />}
        {timeAgo(inv.updatedAt)}
      </span>
    </Link>
  );
}

export function InvestigationRowsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
