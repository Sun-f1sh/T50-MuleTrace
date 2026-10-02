"use client";
import { useState } from "react";
import { CircleCheck, CircleX, Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import type { AuditRecord } from "@shared/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyField } from "@/components/ui/CopyField";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useAsync } from "@/hooks/useAsync";
import { getAuditRecords, verifyAudit } from "@/lib/api";
import { formatDateTime } from "@/lib/utils/format";
import { BlockchainStatus } from "@/components/audit/BlockchainStatus";

function Verification({ record }: { record: AuditRecord }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ offchainHashMatches: boolean; onChainVerified: boolean; verified: boolean; verificationStatus: string; chainId?: string; blockNumber?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setError(null);
    try { setResult(await verifyAudit(record.investigationId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Verification unavailable"); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-col items-start gap-1 lg:items-end">
    {(result?.verified ?? (record.verificationStatus === "verified")) ? <Badge tone="positive"><ShieldCheck className="h-3 w-3"/>Verified on-chain</Badge> : (result?.verificationStatus ?? record.verificationStatus) === "pending" ? <Badge tone="neutral">Recording…</Badge> : <Badge tone="danger">Not on-chain verified</Badge>}
    <button onClick={run} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-muted underline decoration-line underline-offset-2 hover:text-ink disabled:opacity-50">
      {busy ? <Loader2 className="h-3 w-3 animate-spin"/> : result?.verified ? <CircleCheck className="h-3 w-3 text-positive"/> : result && !result.onChainVerified ? <CircleX className="h-3 w-3 text-warn"/> : <Fingerprint className="h-3 w-3"/>}
      Verify record
    </button>
    {(result?.chainId ?? record.chainId) !== "unconfigured" && <span className="max-w-48 text-right font-mono text-[10px] text-faint">Chain {result?.chainId ?? record.chainId} · block {result?.blockNumber || record.blockNumber || "pending"}</span>}
    {result && <span className="max-w-48 text-right text-[10px] text-faint">{result.offchainHashMatches ? "Off-chain hash matches" : "Off-chain hash mismatch"} · {result.onChainVerified ? "EVM proof matches" : "no confirmed EVM proof"}</span>}
    {error && <span className="max-w-48 text-right text-[10px] text-danger">{error}</span>}
  </div>;
}
function AuditRow({ rec }: { rec: AuditRecord }) {
  return <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-6 py-4 lg:grid-cols-[0.8fr_0.65fr_1fr_1fr_0.7fr_0.8fr_0.7fr]">
    <span className="font-mono text-[13px] font-medium text-ink">{rec.investigationId}</span>
    <span className={rec.decision === "confirmed" ? "text-[13px] font-semibold text-danger" : "text-[13px] font-semibold text-positive"}>{rec.decision === "confirmed" ? "Confirmed" : "Cleared"}</span>
    <span className="hidden lg:block"><CopyField value={rec.resultHash}/></span>
    <span className="hidden truncate font-mono text-xs text-muted lg:block">{rec.transactionHash ? <CopyField value={rec.transactionHash}/> : "No transaction hash"}</span>
    <span className="hidden font-mono text-xs text-faint tnum lg:block">{formatDateTime(rec.decidedAt)}</span>
    <span className="col-span-2 lg:col-span-1"><Verification record={rec}/></span>
  </div>;
}
export default function AuditPage() {
  const { data, loading, error, reload } = useAsync(() => getAuditRecords(), []);
  return <>
    <PageHeader title="Audit" description="Off-chain SHA-256 commitments with on-chain verification shown only after a confirmed transaction." />
    <BlockchainStatus />
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      {loading ? <div className="divide-y divide-line">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-6 px-6 py-4"><Skeleton className="h-4 w-28"/><Skeleton className="h-4 w-40"/><Skeleton className="ml-auto h-4 w-24"/></div>)}</div>
        : error ? <ErrorState message={error} onRetry={reload}/>
        : !data || data.length === 0 ? <EmptyState title="No audit records yet" description="A decision produces an off-chain SHA-256 commitment. EVM verification requires a configured and reachable contract."/>
        : <><div className="hidden grid-cols-[0.8fr_0.65fr_1fr_1fr_0.7fr_0.8fr_0.7fr] gap-4 border-b border-line px-6 py-2.5 lg:grid">{["Investigation","Decision","Result hash","Transaction","Timestamp","Verification",""].map((h,i)=><span key={`${h}-${i}`} className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{h}</span>)}</div><div className="divide-y divide-line">{data.map(rec=><AuditRow key={`${rec.investigationId}-${rec.decidedAt}`} rec={rec}/>)}</div></>}
    </section>
  </>;
}
