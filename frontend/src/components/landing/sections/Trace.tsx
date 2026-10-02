import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";

export function TraceSection() {
  return (
    <SectionShell id="workflow" index="02" label="Trace">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
                Accounts become
                <br />
                relationships.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
                MuleTrace links every transaction between accounts and rebuilds
                the flow of funds — who sent, who received, in what order, and
                through which intermediaries.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-line bg-surface p-8">
              <svg viewBox="0 0 520 220" className="w-full" role="img" aria-label="Accounts linked into relationships">
                <g fontFamily="var(--font-plex-mono)" fontSize="10" fill="var(--muted)">
                  {[
                    { x: 70, y: 50, id: "ACC-2213" },
                    { x: 70, y: 110, id: "ACC-2380" },
                    { x: 70, y: 170, id: "ACC-2416" },
                  ].map((n) => (
                    <g key={n.id}>
                      <line x1={n.x + 14} y1={n.y} x2={250} y2={110} stroke="var(--line-strong)" />
                      <circle cx={n.x} cy={n.y} r="10" fill="var(--subtle)" stroke="var(--line-strong)" />
                      <text x={n.x - 14} y={n.y + 3} textAnchor="end">{n.id}</text>
                    </g>
                  ))}
                  <circle cx={260} cy={110} r="16" fill="var(--celery)" />
                  <text x={260} y={148} textAnchor="middle" fill="var(--fg)" fontWeight="600" fontFamily="var(--font-sans)" fontSize="11">
                    ACC-4471
                  </text>
                  {[
                    { x: 450, y: 80, id: "ACC-5102" },
                    { x: 450, y: 140, id: "ACC-5177" },
                  ].map((n) => (
                    <g key={n.id}>
                      <line x1={274} y1={110} x2={n.x - 12} y2={n.y} stroke="var(--line-strong)" />
                      <circle cx={n.x} cy={n.y} r="10" fill="var(--subtle)" stroke="var(--line-strong)" />
                      <text x={n.x + 20} y={n.y + 3}>{n.id}</text>
                    </g>
                  ))}
                </g>
              </svg>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-1 border-t border-line pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">3 senders linked</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">1 hub identified</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">2 destinations traced</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
