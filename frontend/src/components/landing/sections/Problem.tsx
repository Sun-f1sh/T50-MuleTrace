import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";

const STATS = [
  { value: "40+", label: "related transactions sit behind a single suspicious account" },
  { value: "Minutes", label: "for layered funds to disperse across downstream accounts" },
  { value: "Days", label: "to trace one case manually across spreadsheets" },
];

export function ProblemSection() {
  return (
    <SectionShell id="problem" index="01" label="The problem">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <h2 className="text-[clamp(2rem,4.5vw,3.6rem)] font-semibold display-tight text-ink">
              Thousands of transactions.
              <br />
              Fragmented accounts.
              <br />
              <span className="text-faint">One analyst.</span>
            </h2>
          </Reveal>
        </div>
        <div className="lg:col-span-5 lg:pt-3">
          <Reveal delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-muted">
              Transaction data is large, fragmented, and difficult to
              investigate manually. Money moves through layers of accounts in
              minutes — while the evidence needed to understand it stays buried
              in raw rows.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        {STATS.map((stat, i) => (
          <Reveal key={stat.value} delay={i * 0.08} className="bg-surface">
            <div className="px-6 py-8">
              <p className="text-4xl font-semibold tracking-[-0.03em] text-ink">{stat.value}</p>
              <p className="mt-2 max-w-[26ch] text-sm leading-snug text-muted">{stat.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
