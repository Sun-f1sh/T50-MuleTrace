"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import type { DecisionResponse, Investigation } from "@shared/types";
import { useAsync } from "@/hooks/useAsync";
import { getInvestigation } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { RiskPanel } from "./RiskPanel";
import { FactorsPanel } from "./FactorsPanel";
import { DecisionPanel } from "./DecisionPanel";
import { AuditPanel } from "./AuditPanel";
import { InvestigationGraph } from "@/components/graph/InvestigationGraph";
import { TransactionTimeline } from "@/components/timeline/TransactionTimeline";
import { cn } from "@/lib/utils/cn";

const statusBadge = {
  open: { label: "Open", className: "border-line text-muted" },
  confirmed: { label: "Confirmed", className: "border-transparent bg-danger-soft text-danger" },
  cleared: { label: "Cleared", className: "border-transparent bg-positive-soft text-positive" },
} as const;

function InvestigationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <Skeleton className="h-[480px] rounded-xl" />
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  );
}

export function InvestigationView({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<Investigation>(() => getInvestigation(id), [id]);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const investigation = useMemo(
    () =>
      decisionResult && decisionResult.investigation.id === data?.id
        ? decisionResult.investigation
        : data,
    [decisionResult, data],
  );

  if (loading && !investigation) return <InvestigationSkeleton />;
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={reload}
        className="rounded-xl border border-line"
      />
    );
  }
  if (!investigation) return <InvestigationSkeleton />;

  const status = statusBadge[investigation.status];
  const justDecided = decisionResult?.investigation.id === investigation.id;

  return (
    <>
      <PageHeader
        title={investigation.caseNumber}
        description={`Subject account ${investigation.subjectAccountId}`}
        actions={
          <>
            {investigation.status !== "open" && (
              <Badge tone={investigation.status === "confirmed" ? "danger" : "positive"}>
                {status.label}
              </Badge>
            )}
            {investigation.audit?.verificationStatus === "verified" && (
              <Badge tone="positive">
                <ShieldCheck className="h-3 w-3" />
                Verified on-chain
              </Badge>
            )}
            {investigation.status === "open" && (
              <a href="#decision">
                <Button size="sm" variant="secondary">
                  Record decision
                </Button>
              </a>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-faint">
        <Link href="/investigations" className="inline-flex items-center gap-1 text-muted transition-colors hover:text-ink">
          <ChevronLeft className="h-3.5 w-3.5" />
          Investigations
        </Link>
        <span>{investigation.subjectAccountId}</span>
        <span>{investigation.transactions.length} transactions</span>
        <span>{investigation.accounts.length} accounts</span>
        {investigation.datasetName && <span>{investigation.datasetName}</span>}
      </div>

      {/* Risk → Explanation */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <RiskPanel investigation={investigation} />
        <FactorsPanel investigation={investigation} />
      </div>

      {/* Network */}
      <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Account network</h2>
            <span className="font-mono text-xs text-faint tnum">
              {investigation.accounts.length} accounts · {investigation.graph.edges.length} transfers
            </span>
          </div>
          {(selectedAccountId || selectedTransactionId) && (
            <span className="font-mono text-[11px] text-muted">
              {selectedAccountId ? `Selection: ${selectedAccountId}` : "Transaction selected"}
            </span>
          )}
        </header>
        <InvestigationGraph
          investigation={investigation}
          selectedAccountId={selectedAccountId}
          selectedTransactionId={selectedTransactionId}
          onSelectAccount={(accountId) => {
            setSelectedAccountId(accountId);
            setSelectedTransactionId(null);
          }}
          onSelectTransaction={(txId) => {
            setSelectedTransactionId(txId);
          }}
        />
      </section>

      {/* Transactions */}
      <div className="mt-6">
        <TransactionTimeline
          investigation={investigation}
          selectedAccountId={selectedAccountId}
          selectedTransactionId={selectedTransactionId}
          onSelectTransaction={setSelectedTransactionId}
        />
      </div>

      {/* Decision + Audit */}
      <div id="decision" className="mt-6 grid gap-6 lg:grid-cols-2">
        {investigation.status === "open" ? (
          <DecisionPanel
            investigation={investigation}
            onDecided={(result) => setDecisionResult(result)}
          />
        ) : (
          <section className="rounded-xl border border-line bg-surface">
            <header className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-ink">Decision</h2>
            </header>
            <div className="px-6 py-5">
              <p
                className={cn(
                  "text-lg font-semibold tracking-[-0.01em]",
                  investigation.status === "confirmed" ? "text-danger" : "text-positive",
                )}
              >
                {investigation.status === "confirmed" ? "Confirmed suspicious" : "Cleared"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-faint">
                {investigation.decidedBy} · {investigation.decidedAt ? new Date(investigation.decidedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}
              </p>
              {investigation.decisionNote && (
                <p className="mt-3 rounded-lg border border-line bg-subtle px-4 py-3 text-[13px] leading-relaxed text-muted">
                  {investigation.decisionNote}
                </p>
              )}
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Recorded · append-only · tamper-evident
              </p>
            </div>
          </section>
        )}

        {investigation.audit ? (
          <AuditPanel audit={investigation.audit} justDecided={justDecided} />
        ) : (
          <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
            <ShieldCheck className="h-5 w-5 text-faint" />
            <p className="mt-3 text-[14px] font-medium text-ink">Audit record pending</p>
            <p className="mt-1 max-w-xs text-[13px] text-muted">
              The audit record is generated when the decision is confirmed or cleared.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
