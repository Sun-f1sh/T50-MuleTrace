import { ShieldCheck } from "lucide-react";
import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";

const RECORD: [string, React.ReactNode][] = [
  ["Investigation", <span key="i" className="font-mono text-[13px] text-ink">MT-2026-0847</span>],
  ["Decision", <span key="d" className="font-semibold text-ink">Confirmed suspicious</span>],
  ["Timestamp", <span key="t" className="font-mono text-[13px] text-muted tnum">2026-09-28 16:12 UTC</span>],
  ["Result hash", <span key="r" className="font-mono text-[13px] text-muted">9f3ac2e8…e24c1b07</span>],
  ["Transaction hash", <span key="x" className="font-mono text-[13px] text-muted">0x74bd…b3a1</span>],
  ["Anchored at", <span key="b" className="font-mono text-[13px] text-muted tnum">Block 1,876,422</span>],
];

export function AuditSection() {
  return (
    <SectionShell id="audit" index="07" label="Audit">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
              Tamper-evident
              <br />
              by design.
            </h2>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
              Every decision is hashed and anchored to an append-only audit
              chain. Once recorded, an investigation result cannot be quietly
              altered — the record speaks for itself.
            </p>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-faint">
              Audit infrastructure, not currency. Integrity is the feature.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-line bg-surface p-8">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Audit record
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-positive">
                  <ShieldCheck className="h-4 w-4" />
                  Verified on-chain
                </span>
              </div>
              <dl className="mt-2">
                {RECORD.map(([term, value]) => (
                  <div key={term} className="flex items-center justify-between gap-6 border-b border-line py-3.5 last:border-0">
                    <dt className="text-[13px] text-faint">{term}</dt>
                    <dd className="truncate">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
