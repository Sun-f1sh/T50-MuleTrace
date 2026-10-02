"use client";

import { useCallback } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getAlerts, getAuditRecords, getDashboardSummary, getInvestigations } from "@/lib/api";
import { AdminOverview } from "@/components/admin/AdminOverview";
import type { Alert, AuditRecord, DashboardSummary, InvestigationSummary } from "@shared/types";

export default function AdminPage() {
  const summary = useAsync<DashboardSummary>(() => getDashboardSummary(), []);
  const alerts = useAsync<Alert[]>(() => getAlerts(), []);
  const investigations = useAsync<InvestigationSummary[]>(() => getInvestigations(), []);
  const audit = useAsync<AuditRecord[]>(() => getAuditRecords(), []);

  const reload = useCallback(() => {
    summary.reload();
    alerts.reload();
    investigations.reload();
    audit.reload();
  }, [alerts, audit, investigations, summary]);

  const error = summary.error ?? alerts.error ?? investigations.error ?? audit.error;

  return (
    <AdminOverview
      data={{
        summary: summary.data,
        alerts: alerts.data,
        investigations: investigations.data,
        audit: audit.data,
        loading: summary.loading || alerts.loading || investigations.loading || audit.loading,
        error,
        reload,
      }}
    />
  );
}
