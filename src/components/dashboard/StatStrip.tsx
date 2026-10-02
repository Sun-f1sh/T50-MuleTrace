import { Skeleton } from "@/components/ui/states";
import { formatCompactCurrencyLabel } from "@/lib/utils/format";
import type { DashboardSummary } from "@shared/types";

function Stat({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="px-6 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-24" />
      ) : (
        <p className="mt-1.5 text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink tnum">
          {value}
        </p>
      )}
      {sub && <p className="mt-2 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

export function StatStrip({
  summary,
  loading,
}: {
  summary: DashboardSummary | null;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
      <Stat
        label="Active alerts"
        value={summary ? String(summary.activeAlerts) : ""}
        sub={summary ? `${summary.newAlertsToday} detected in the last 24h` : undefined}
        loading={loading}
      />
      <Stat
        label="High-risk investigations"
        value={summary ? String(summary.highRiskInvestigations) : ""}
        sub={summary ? "Score 65 and above, still open" : undefined}
        loading={loading}
      />
      <Stat
        label="Open cases"
        value={summary ? String(summary.openInvestigations) : ""}
        sub={
          summary
            ? `${summary.confirmedInvestigations} confirmed · ${summary.clearedInvestigations} cleared`
            : undefined
        }
        loading={loading}
      />
      <Stat
        label="Flagged volume"
        value={summary ? formatCompactCurrencyLabel(summary.flaggedVolume, summary.currency) : ""}
        sub={summary ? "Across unresolved alerts" : undefined}
        loading={loading}
      />
    </div>
  );
}
