"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Alert } from "@shared/types";
import { DETECTION_PATTERN_LABELS } from "@shared/types";
import { Badge } from "@/components/ui/Badge";
import { RiskDot } from "@/components/ui/StatusDot";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { formatCurrency, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const alertStatusTone = {
  new: "celery",
  "in-review": "neutral",
  resolved: "positive",
} as const;

const alertStatusLabel = {
  new: "New",
  "in-review": "In review",
  resolved: "Resolved",
} as const;

export function AlertQueue({
  alerts,
  loading,
  error,
  onRetry,
  limit,
  footerHref,
  title = "Alert queue",
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  limit?: number;
  footerHref?: string;
  title?: string;
}) {
  const visible = limit ? alerts?.slice(0, limit) : alerts;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {alerts && (
            <span className="font-mono text-xs text-faint tnum">{alerts.length}</span>
          )}
        </div>
        {footerHref && (
          <Link
            href={footerHref}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {loading ? (
        <SkeletonRows rows={6} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !alerts || alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="New suspicious-activity alerts will appear here as detection runs complete."
        />
      ) : (
        <>
          <div className="hidden grid-cols-[1.3fr_0.6fr_1.1fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-line px-6 py-2.5 lg:grid">
            {["Account", "Risk", "Primary signal", "Volume", "Status", "Detected"].map((h) => (
              <span
                key={h}
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.16em] text-faint",
                  h === "Volume" || h === "Risk" ? "text-right" : "",
                )}
              >
                {h}
              </span>
            ))}
          </div>
          <div className="divide-y divide-line">
            {visible?.map((alert) => (
              <Link
                key={alert.id}
                href={`/investigations/${alert.investigationId}`}
                className="group grid grid-cols-2 items-center gap-x-4 gap-y-1 px-6 py-4 transition-colors hover:bg-subtle lg:grid-cols-[1.3fr_0.6fr_1.1fr_0.9fr_0.8fr_0.8fr] lg:gap-4"
              >
                <span className="col-span-2 flex items-center gap-2.5 lg:col-span-1">
                  <RiskDot level={alert.riskLevel} />
                  <span className="font-mono text-[13px] font-medium text-ink">{alert.accountId}</span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-faint transition-opacity group-hover:opacity-100 lg:opacity-0" />
                </span>
                <span className="text-right font-mono text-[13px] font-semibold text-ink tnum lg:text-right">
                  {alert.riskScore}
                </span>
                <span className="hidden text-[13px] text-muted lg:block">
                  {DETECTION_PATTERN_LABELS[alert.primaryPattern]}
                </span>
                <span className="hidden text-right font-mono text-[13px] text-muted tnum lg:block">
                  {formatCurrency(alert.flaggedVolume, alert.currency, { compact: true })}
                </span>
                <span className="hidden lg:block">
                  <Badge tone={alertStatusTone[alert.status]}>{alertStatusLabel[alert.status]}</Badge>
                </span>
                <span className="hidden text-right font-mono text-xs text-faint lg:block">
                  {timeAgo(alert.detectedAt)}
                </span>
                <span className="col-span-2 flex items-center gap-2 text-[12px] text-faint lg:hidden">
                  {DETECTION_PATTERN_LABELS[alert.primaryPattern]} · {formatCurrency(alert.flaggedVolume, alert.currency, { compact: true })} ·{" "}
                  {alertStatusLabel[alert.status]} · {timeAgo(alert.detectedAt)}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
