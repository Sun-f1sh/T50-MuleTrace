import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";
import { CircleCheck, TriangleAlert } from "lucide-react";

export function DecideSection() {
  return (
    <SectionShell index="06" label="Decide">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
              Every case ends
              <br />
              in a decision.
            </h2>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
              No auto-close. No silent dispositions. The analyst explicitly
              marks the investigation — and the platform records who decided,
              when, and on what evidence.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-danger/40 bg-danger-soft p-7 transition-transform duration-200 hover:-translate-y-0.5">
                <TriangleAlert className="h-5 w-5 text-danger" />
                <p className="mt-16 text-xl font-semibold tracking-[-0.01em] text-ink">Confirm suspicious</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  Status → Confirmed · audit hash recorded
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-7 transition-transform duration-200 hover:-translate-y-0.5">
                <CircleCheck className="h-5 w-5 text-positive" />
                <p className="mt-16 text-xl font-semibold tracking-[-0.01em] text-ink">Clear</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  Status → Cleared · audit hash recorded
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
