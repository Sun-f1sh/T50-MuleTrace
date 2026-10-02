"use client";
import type { Investigation } from "@shared/types";
import { DETECTION_PATTERN_LABELS } from "@shared/types";
import { formatCurrency } from "@/lib/utils/format";

function attributionLabel(item: NonNullable<Investigation["prediction"]>["featureAttributions"][number]): string {
  if (item.effectPoints !== undefined) return `· ${item.effectPoints > 0 ? "+" : ""}${item.effectPoints} pp`;
  if (item.standardizedDeviation !== undefined) return `· ${item.standardizedDeviation > 0 ? "+" : ""}${item.standardizedDeviation}σ`;
  return "";
}

export function FactorsPanel({ investigation }: { investigation: Investigation }) {
  const factors = investigation.riskFactors.slice().sort((a, b) => b.weight - a.weight);
  const attributions = investigation.prediction?.featureAttributions ?? [];
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-6 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Why this account was flagged</h2>
        <p className="mt-0.5 text-[13px] text-muted">Signals from the detection engine, ranked by contribution to the score.</p>
      </header>
      {attributions.length > 0 && (
        <div className="border-b border-line px-6 py-4">
          <p className="text-[13px] font-semibold text-ink">Model feature attribution</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Supervised entries show held-out risk-probability change when one feature is reset to its training-fold median; anomaly entries show standardized deviations. These are evidence aids, not causal findings.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {attributions.map((item, index) => (
              <span key={`${item.feature}-${index}`} className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-muted">
                <strong className="font-mono text-ink">{item.feature}</strong> {attributionLabel(item)}
              </span>
            ))}
          </div>
        </div>
      )}
      {factors.length === 0 ? (
        <div className="px-6 py-8 text-sm text-muted">No risk factors recorded.</div>
      ) : (
        <ol className="divide-y divide-line">
          {factors.map((factor, index) => (
            <li key={factor.id} className="flex items-start gap-5 px-6 py-5">
              <span className="mt-0.5 w-6 shrink-0 font-mono text-xs text-faint">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{factor.title}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{DETECTION_PATTERN_LABELS[factor.pattern]}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{factor.description}</p>
                <p className="mt-1.5 font-mono text-[11px] text-faint tnum">
                  {factor.evidence.transactionsInvolved} tx · {factor.evidence.accountsInvolved} accounts · {formatCurrency(factor.evidence.totalAmount, investigation.currency, { compact: true })}
                </p>
              </div>
              <div className="w-24 shrink-0 pt-1">
                <div className="h-[3px] rounded-full bg-line">
                  <div className="h-[3px] rounded-full bg-celery" style={{ width: `${factor.weight * 2.6}%` }} />
                </div>
                <p className="mt-1.5 text-right font-mono text-[11px] text-faint tnum">{factor.weight} pts</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
