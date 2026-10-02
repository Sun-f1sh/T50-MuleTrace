"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import type { AuditRecord } from "@shared/types";
import { CopyField } from "@/components/ui/CopyField";
import { formatDate } from "@/lib/utils/format";

/** After a fresh decision the record is shown as "recording" before flipping to verified. */
export function AuditPanel({ audit, justDecided }: { audit: AuditRecord; justDecided?: boolean }) {
  const [pending, setPending] = useState(Boolean(justDecided));

  useEffect(() => {
    if (!justDecided) return;
    const t = setTimeout(() => setPending(false), 1800);
    return () => clearTimeout(t);
  }, [justDecided]);

  const verified = audit.verificationStatus === "verified" && !pending;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Audit record</h2>
        {verified ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-positive">
            <ShieldCheck className="h-4 w-4" />
            Verified on-chain
          </span>
        ) : audit.verificationStatus === "failed" ? (
          <span className="text-[13px] font-semibold text-danger">Failed</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Recording…
          </span>
        )}
      </header>

      <dl className="px-6 py-2">
        {[
          ["Investigation", <span key="i" className="font-mono text-[13px] text-ink">{audit.investigationId}</span>],
          [
            "Decision",
            <span
              key="d"
              className={audit.decision === "confirmed" ? "font-semibold text-danger" : "font-semibold text-positive"}
            >
              {audit.decision === "confirmed" ? "Confirmed suspicious" : "Cleared"}
            </span>,
          ],
          ["Analyst", <span key="a" className="text-[13px] text-muted">{audit.decidedBy}</span>],
          ["Timestamp", <span key="t" className="font-mono text-[13px] text-muted tnum">{formatDate(audit.decidedAt)}</span>],
          ["Result hash", <CopyField key="r" value={audit.resultHash} />],
          ["Transaction hash", <CopyField key="x" value={audit.transactionHash} />],
          [
            "Anchored at",
            <span key="b" className="font-mono text-[13px] text-muted tnum">
              Block {audit.blockNumber.toLocaleString("en-US")} · {audit.chainId}
            </span>,
          ],
        ].map(([term, value]) => (
          <div
            key={term as string}
            className="flex items-center justify-between gap-6 border-b border-line py-3 last:border-0"
          >
            <dt className="shrink-0 text-[13px] text-faint">{term}</dt>
            <dd className="min-w-0 truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <footer className="border-t border-line px-6 py-3">
        <Link
          href="/audit"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          View audit ledger
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </footer>
    </section>
  );
}
