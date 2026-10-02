import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";

const FACTORS = [
  { label: "14 accounts transferred funds into this account", weight: 82 },
  { label: "Funds were distributed to 9 downstream accounts", weight: 64 },
  { label: "Multiple transfers occurred within short intervals", weight: 55 },
  { label: "Circular movement detected across connected accounts", weight: 47 },
];

export function UnderstandSection() {
  return (
    <SectionShell index="04" label="Understand">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
              A score you
              <br />
              can defend.
            </h2>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
              Detection signals are translated into a risk score, ranked
              factors, and a plain-language explanation — evidence first,
              conclusion second.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-[240px_1fr]">
              <div className="bg-surface p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Risk score</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[64px] font-semibold leading-none tracking-[-0.04em] text-ink tnum">87</span>
                  <span className="text-sm text-faint tnum">/ 100</span>
                </div>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-danger">High risk</p>
                <div className="mt-4 h-1 rounded-full bg-line">
                  <div className="h-1 w-[87%] rounded-full bg-danger" />
                </div>
              </div>
              <div className="bg-surface p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Why this account was flagged
                </p>
                <ul className="mt-4 space-y-4">
                  {FACTORS.map((f) => (
                    <li key={f.label}>
                      <p className="text-[13.5px] leading-snug text-ink">{f.label}</p>
                      <div className="mt-1.5 h-[3px] rounded-full bg-line">
                        <div className="h-[3px] rounded-full bg-celery" style={{ width: `${f.weight}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
