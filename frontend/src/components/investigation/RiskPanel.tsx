"use client";

import type { Investigation } from "@shared/types";
import { Badge } from "@/components/ui/Badge";
import { RiskDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils/cn";

const levelLabel: Record<Investigation["riskLevel"], string> = {
  low: "LOW RISK",
  medium: "MEDIUM RISK",
  high: "HIGH RISK",
  critical: "CRITICAL",
};

const levelText: Record<Investigation["riskLevel"], string> = {
  low: "text-positive",
  medium: "text-warn",
  high: "text-danger",
  critical: "text-danger",
};

export function RiskPanel({ investigation }: { investigation: Investigation }) {
  const patterns = Array.from(new Set(investigation.riskFactors.map((f) => f.pattern)));

  return (
    <section className="flex flex-col rounded-xl border border-line bg-surface p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Risk score</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[72px] font-semibold leading-none tracking-[-0.045em] text-ink tnum">
          {investigation.riskScore}
        </span>
        <span className="text-sm text-faint tnum">/ 100</span>
      </div>
      <p className={cn("mt-2 text-[13px] font-bold uppercase tracking-[0.16em]", levelText[investigation.riskLevel])}>
        {levelLabel[investigation.riskLevel]}
      </p>

      <div className="mt-4 h-1 w-full rounded-full bg-line">
        <div
          className={cn(
            "h-1 rounded-full",
            investigation.riskLevel === "high" || investigation.riskLevel === "critical"
              ? "bg-danger"
              : investigation.riskLevel === "medium"
                ? "bg-warn"
                : "bg-positive",
          )}
          style={{ width: `${investigation.riskScore}%` }}
        />
      </div>

      <p className="mt-6 text-[14px] leading-relaxed text-muted">{investigation.summary}</p>

      {patterns.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {patterns.map((p) => (
            <Badge key={p} tone="neutral" className="font-mono text-[10px] uppercase tracking-[0.08em]">
              <RiskDot
                level={p === "circular" ? "high" : p === "fan-out" ? "medium" : "low"}
              />
              {p.replace(/-/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6">
        <div className="border-t border-line pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            {investigation.transactions.length} transactions · {investigation.accounts.length} accounts
            {investigation.datasetName ? ` · ${investigation.datasetName}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
