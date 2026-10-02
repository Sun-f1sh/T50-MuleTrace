"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CircleGauge,
  Database,
  Filter,
  ListChecks,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { Alert, AuditRecord, DashboardSummary, InvestigationSummary } from "@shared/types";
import { API_MODE } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ImportCsv } from "@/components/dashboard/ImportCsv";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { formatCompactCurrencyLabel, formatDateTime, formatNumber, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 6;

type SortKey = "riskScore" | "flaggedVolume" | "detectedAt";
type DataState = {
  summary: DashboardSummary | null;
  alerts: Alert[] | null;
  investigations: InvestigationSummary[] | null;
  audit: AuditRecord[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

function toneForRisk(level: Alert["riskLevel"]): "danger" | "warn" | "positive" | "neutral" {
  if (level === "critical" || level === "high") return "danger";
  if (level === "medium") return "warn";
  if (level === "low") return "positive";
  return "neutral";
}

function toneForStatus(status: Alert["status"]): "danger" | "warn" | "positive" | "neutral" {
  if (status === "new") return "danger";
  if (status === "in-review") return "warn";
  if (status === "resolved") return "positive";
  return "neutral";
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-line bg-surface", className)}>{children}</section>;
}

function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        {eyebrow && <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{eyebrow}</p>}
        <h2 className="mt-1 text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </header>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
  accent: "mint" | "honeyberry" | "celery" | "warn";
}) {
  const accentClass = {
    mint: "bg-mint-wash text-positive dark:text-mint",
    honeyberry: "bg-honeyberry-wash text-info",
    celery: "bg-celery-wash text-ink",
    warn: "bg-warn-soft text-warn",
  }[accent];

  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink tnum">{value}</p>
      <p className="mt-2 text-[12px] text-muted">{sub}</p>
    </div>
  );
}

function OverviewMetrics({ summary, loading }: { summary: DashboardSummary | null; loading: boolean }) {
  if (loading && !summary) {
    return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[142px] rounded-xl" />)}</div>;
  }
  if (!summary) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Activity} label="Transactions processed" value={formatNumber(summary.flaggedVolume > 0 ? summary.recentInvestigations.reduce((n, i) => n + i.transactionCount, 0) : 0)} sub="Across recent investigation runs" accent="honeyberry" />
      <Metric icon={Users} label="Accounts analyzed" value={formatNumber(summary.recentInvestigations.reduce((n, i) => n + i.accountCount, 0))} sub="Accounts in the current review set" accent="celery" />
      <Metric icon={Bell} label="Alerts generated" value={formatNumber(summary.activeAlerts)} sub={`${summary.newAlertsToday} detected in the last 24h`} accent="warn" />
      <Metric icon={ListChecks} label="Open investigations" value={formatNumber(summary.openInvestigations)} sub={`${summary.confirmedInvestigations} confirmed · ${summary.clearedInvestigations} cleared`} accent="mint" />
    </div>
  );
}

function DetectionBreakdown({ alerts }: { alerts: Alert[] | null }) {
  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of alerts ?? []) counts.set(alert.primaryPattern, (counts.get(alert.primaryPattern) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [alerts]);
  const max = Math.max(1, ...breakdown.map(([, count]) => count));

  return (
    <Panel>
      <PanelHeader eyebrow="Detection engine" title="Detection activity" action={<Badge tone="neutral">Derived from alerts</Badge>} />
      <div className="space-y-4 px-5 py-5">
        {breakdown.length === 0 ? <EmptyState title="No detection activity" description="Detection data will appear after an analysis run." /> : breakdown.map(([pattern, count]) => (
          <div key={pattern}>
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-mono uppercase tracking-[0.08em] text-muted">{pattern.replace(/-/g, "_")}</span>
              <span className="font-mono text-ink tnum">{count}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-honeyberry" style={{ width: `${(count / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityPanel({ audit, investigations }: { audit: AuditRecord[] | null; investigations: InvestigationSummary[] | null }) {
  const activity = useMemo(() => {
    const decisions = (audit ?? []).map((record) => ({ id: `${record.investigationId}-${record.decidedAt}`, label: `${record.decision === "confirmed" ? "Confirmed" : "Cleared"} ${record.investigationId}`, detail: `by ${record.decidedBy}`, at: record.decidedAt, tone: record.decision === "confirmed" ? "danger" as const : "positive" as const }));
    const opened = (investigations ?? []).filter((item) => item.status === "open").slice(0, 3).map((item) => ({ id: item.id, label: `Opened ${item.caseNumber}`, detail: item.subjectAccountId, at: item.createdAt, tone: "info" as const }));
    return [...decisions, ...opened].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [audit, investigations]);

  return (
    <Panel>
      <PanelHeader eyebrow="Review trail" title="Recent activity" action={<Link href="/audit" className="inline-flex items-center gap-1 text-[12px] font-semibold text-info hover:underline">View audit <ArrowUpRight className="h-3.5 w-3.5" /></Link>} />
      {activity.length === 0 ? <EmptyState title="No activity yet" description="Analyst and administrative activity will appear here when available." /> : <div className="divide-y divide-line">{activity.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3.5"><span className={cn("h-2 w-2 rounded-full", item.tone === "danger" ? "bg-danger" : item.tone === "positive" ? "bg-positive" : "bg-honeyberry")} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-ink">{item.label}</p><p className="mt-0.5 font-mono text-[10px] text-faint">{item.detail}</p></div><span className="shrink-0 font-mono text-[10px] text-faint">{timeAgo(item.at)}</span></div>)}</div>}
    </Panel>
  );
}

function AlertManagement({ alerts, loading, error, reload }: { alerts: Alert[] | null; loading: boolean; error: string | null; reload: () => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Alert["status"]>("all");
  const [sort, setSort] = useState<SortKey>("riskScore");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (alerts ?? []).filter((alert) => (status === "all" || alert.status === status) && (!q || alert.id.toUpperCase().includes(q) || alert.accountId.toUpperCase().includes(q) || alert.primaryPattern.toUpperCase().includes(q))).sort((a, b) => sort === "detectedAt" ? b.detectedAt.localeCompare(a.detectedAt) : b[sort] - a[sort]);
  }, [alerts, query, sort, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (error) return <Panel><ErrorState message={error} onRetry={reload} /></Panel>;

  return (
    <Panel>
      <PanelHeader eyebrow="Operations" title="Alert management" action={<Badge tone="neutral">{filtered.length} results</Badge>} />
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-faint" /><input aria-label="Search alerts" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search alert, account, or detection" className="h-8 w-full rounded-full border border-line bg-bg pl-9 pr-3 text-[12px] text-ink outline-none placeholder:text-faint focus:border-line-strong" /></label>
        <label className="flex h-8 items-center gap-2 rounded-full border border-line px-3 text-[11px] text-muted"><Filter className="h-3.5 w-3.5" /><span className="sr-only">Status</span><select aria-label="Filter alert status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="bg-transparent text-ink outline-none"><option value="all">All status</option><option value="new">New</option><option value="in-review">In review</option><option value="resolved">Resolved</option></select></label>
        <label className="flex h-8 items-center gap-2 rounded-full border border-line px-3 text-[11px] text-muted"><SlidersHorizontal className="h-3.5 w-3.5" /><span className="sr-only">Sort alerts</span><select aria-label="Sort alerts" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-transparent text-ink outline-none"><option value="riskScore">Sort: risk</option><option value="flaggedVolume">Sort: amount</option><option value="detectedAt">Sort: newest</option></select></label>
      </div>
      {loading && !alerts ? <div className="space-y-3 px-5 py-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div> : visible.length === 0 ? <EmptyState title="No alerts match" description="Try a different search or status filter." /> : <>
        <div className="hidden grid-cols-[1.1fr_0.9fr_1fr_0.55fr_0.85fr_0.8fr_0.8fr] gap-4 border-b border-line px-5 py-2.5 lg:grid">{["Alert", "Account", "Detection", "Risk", "Amount", "Observed", "Status"].map((heading) => <span key={heading} className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{heading}</span>)}</div>
        <div className="divide-y divide-line">{visible.map((alert) => <div key={alert.id} className="grid gap-2 px-5 py-3.5 lg:grid-cols-[1.1fr_0.9fr_1fr_0.55fr_0.85fr_0.8fr_0.8fr] lg:items-center lg:gap-4"><div><p className="font-mono text-[12px] font-medium text-ink">{alert.id}</p><Link href={`/investigations/${alert.investigationId}`} className="mt-1 inline-flex items-center gap-1 text-[11px] text-info hover:underline">Inspect investigation <ArrowUpRight className="h-3 w-3" /></Link></div><span className="font-mono text-[12px] text-muted">{alert.accountId}</span><span className="font-mono text-[11px] uppercase text-muted">{alert.primaryPattern.replace(/-/g, "_")}</span><Badge tone={toneForRisk(alert.riskLevel)}>{alert.riskScore}</Badge><span className="font-mono text-[12px] text-ink tnum">{formatCompactCurrencyLabel(alert.flaggedVolume, alert.currency)}</span><span className="font-mono text-[11px] text-faint">{formatDateTime(alert.detectedAt)}</span><Badge tone={toneForStatus(alert.status)}>{alert.status.replace(/-/g, " ")}</Badge></div>)}</div>
        <footer className="flex items-center justify-between border-t border-line px-5 py-3"><span className="font-mono text-[10px] text-faint">Page {page} of {pages}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></footer>
      </>}
    </Panel>
  );
}

function AdminReadiness({ summary }: { summary: DashboardSummary | null }) {
  return <div className="grid gap-4 lg:grid-cols-3"><Panel><PanelHeader eyebrow="Ingestion" title="Dataset operations" action={<Database className="h-4 w-4 text-honeyberry" />} /><div className="px-5 py-4"><p className="text-[13px] text-muted">Use the existing CSV workflow to start a new analysis run. Processing state is shown by the importer.</p><div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-subtle px-3 py-2.5"><span className="font-mono text-[11px] text-faint">Last visible run</span><span className="font-mono text-[11px] text-ink">{summary ? "Available" : "No run"}</span></div><div className="mt-4"><ImportCsv /></div></div></Panel><Panel><PanelHeader eyebrow="Configuration" title="Detection rules" action={<Settings2 className="h-4 w-4 text-honeyberry" />} /><div className="px-5 py-4"><Badge tone="celery">Prototype · read only</Badge><p className="mt-3 text-[13px] leading-relaxed text-muted">No admin configuration API exists in the current contract. Backend thresholds remain environment-level settings and are not editable here.</p><div className="mt-4 space-y-2">{["FAN_IN_OUT", "CIRCULAR_TRANSFER", "PASS_THROUGH", "SHARED_ATTRIBUTE"].map((rule) => <div key={rule} className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><span className="font-mono text-[10px] text-muted">{rule}</span><span className="font-mono text-[10px] text-faint">backend rule</span></div>)}</div></div></Panel><Panel><PanelHeader eyebrow="Access posture" title="Admin readiness" action={<ShieldCheck className="h-4 w-4 text-honeyberry" />} /><div className="px-5 py-4"><Badge tone="warn">Demo access model</Badge><p className="mt-3 text-[13px] leading-relaxed text-muted">This route is a frontend operations prototype. Authentication and authorization are not implemented by the current backend.</p><Link href="/audit" className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-info hover:underline">Review audit records <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></Panel></div>;
}

export function AdminOverview({ data }: { data: DataState }) {
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-honeyberry">Operations console</p><h1 className="mt-2 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-ink">Admin overview</h1><p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">Monitor ingestion, detection activity, alert queues, and review operations from one place.</p></div><div className="flex items-center gap-2"><Badge tone={API_MODE === "mock" ? "celery" : "mint"}>{API_MODE === "mock" ? "Prototype data" : "Live API"}</Badge><Button size="sm" variant="secondary" onClick={data.reload}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button></div></div><OverviewMetrics summary={data.summary} loading={data.loading} />{data.error && <ErrorState message={data.error} onRetry={data.reload} className="rounded-xl border border-line" />}<div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"><DetectionBreakdown alerts={data.alerts} /><ActivityPanel audit={data.audit} investigations={data.investigations} /></div><AlertManagement alerts={data.alerts} loading={data.loading} error={data.error} reload={data.reload} /><AdminReadiness summary={data.summary} /><div className="flex items-center gap-2 font-mono text-[10px] text-faint"><CircleGauge className="h-3.5 w-3.5" />Admin metrics are derived from the existing frontend adapter; unsupported backend capabilities are labeled read-only.</div></div>;
}
