import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";

function DiagramFanIn() {
  return (
    <svg viewBox="0 0 96 48" className="h-12 w-24">
      {[8, 20, 32].map((y) => (
        <g key={y}>
          <line x1="14" y1={y + 4} x2="66" y2="24" stroke="var(--line-strong)" />
          <circle cx="10" cy={y + 4} r="4" fill="var(--faint)" />
        </g>
      ))}
      <circle cx="72" cy="24" r="6.5" fill="var(--celery)" />
    </svg>
  );
}

function DiagramFanOut() {
  return (
    <svg viewBox="0 0 96 48" className="h-12 w-24">
      <circle cx="10" cy="24" r="6.5" fill="var(--celery)" />
      {[8, 20, 32].map((y) => (
        <g key={y}>
          <line x1="17" y1="24" x2="78" y2={y + 4} stroke="var(--line-strong)" />
          <circle cx="82" cy={y + 4} r="4" fill="var(--tone-danger)" />
        </g>
      ))}
    </svg>
  );
}

function DiagramCircular() {
  return (
    <svg viewBox="0 0 96 48" className="h-12 w-24">
      <circle cx="30" cy="12" r="5" fill="var(--faint)" />
      <circle cx="66" cy="12" r="5" fill="var(--celery)" />
      <circle cx="48" cy="38" r="5" fill="var(--tone-danger)" />
      <path d="M 36 13 A 22 22 0 0 1 61 16" fill="none" stroke="var(--line-strong)" />
      <path d="M 62 18 A 24 24 0 0 1 50 33" fill="none" stroke="var(--line-strong)" />
      <path d="M 43 34 A 24 24 0 0 1 29 17" fill="none" stroke="var(--line-strong)" />
    </svg>
  );
}

function DiagramRapid() {
  return (
    <svg viewBox="0 0 96 48" className="h-12 w-24">
      <circle cx="14" cy="24" r="5" fill="var(--faint)" />
      <circle cx="34" cy="24" r="6.5" fill="var(--celery)" />
      <circle cx="74" cy="24" r="5" fill="var(--tone-danger)" />
      <line x1="20" y1="24" x2="26" y2="24" stroke="var(--line-strong)" />
      <line x1="42" y1="24" x2="66" y2="24" stroke="var(--line-strong)" strokeDasharray="4 3" />
      <path d="M 62 20 L 68 24 L 62 28" fill="none" stroke="var(--line-strong)" />
    </svg>
  );
}

const PATTERNS = [
  {
    name: "Many → One",
    description: "Funds from multiple accounts consolidating into a single hub.",
    Diagram: DiagramFanIn,
  },
  {
    name: "One → Many",
    description: "A hub distributing funds outward to many downstream accounts.",
    Diagram: DiagramFanOut,
  },
  {
    name: "Circular transfers",
    description: "Money looping back to earlier senders to disguise its origin.",
    Diagram: DiagramCircular,
  },
  {
    name: "Rapid in → out",
    description: "Inflows dispersed again within minutes — pass-through behavior.",
    Diagram: DiagramRapid,
  },
];

export function DetectSection() {
  return (
    <SectionShell index="03" label="Detect">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
                Patterns that hide
                <br />
                in plain sight.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
                The detection engine screens every account for the movement
                structures that matter — and ignores the noise.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="border-t border-line">
            {PATTERNS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.06}>
                <div className="group flex items-center gap-6 border-b border-line py-7 transition-colors hover:bg-subtle">
                  <span className="w-8 shrink-0 font-mono text-xs text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p.Diagram />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-[-0.01em] text-ink">{p.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{p.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
