"use client";

import { useAsync } from "@/hooks/useAsync";
import { getAlerts, getDashboardSummary } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/states";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { AlertQueue } from "@/components/dashboard/AlertQueue";
import { RecentInvestigations } from "@/components/dashboard/RecentInvestigations";
import { ImportCsv } from "@/components/dashboard/ImportCsv";

export default function DashboardPage() {
  const summary = useAsync(() => getDashboardSummary(), []);
  const alerts = useAsync(() => getAlerts(), []);

  const reloadAll = () => {
    summary.reload();
    alerts.reload();
  };

  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs attention, why, and what has already been decided."
        actions={<ImportCsv onImported={reloadAll} />}
      />

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} className="rounded-xl border border-line" />
      ) : (
        <StatStrip summary={summary.data} loading={summary.loading} />
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <AlertQueue
          title="Alert queue"
          alerts={alerts.data}
          loading={alerts.loading}
          error={alerts.error}
          onRetry={alerts.reload}
          limit={8}
          footerHref="/alerts"
        />
        <RecentInvestigations
          investigations={summary.data?.recentInvestigations ?? null}
          loading={summary.loading}
        />
      </div>
    </>
  );
}
