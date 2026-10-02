import { SectionShell } from "../SectionShell";
import { Reveal } from "../Reveal";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const ROWS = [
  { time: "08:12", pair: "ACC-2213 → ACC-4471", amount: "$48,250", signal: "FAN-IN", dir: "in" },
  { time: "08:15", pair: "ACC-2380 → ACC-4471", amount: "$31,900", signal: "FAN-IN", dir: "in" },
  { time: "08:19", pair: "ACC-2416 → ACC-4471", amount: "$12,400", signal: "FAN-IN", dir: "in" },
  { time: "08:36", pair: "ACC-4471 → ACC-5102", amount: "$64,000", signal: "FAN-OUT", dir: "out" },
  { time: "08:41", pair: "ACC-4471 → ACC-5177", amount: "$22,750", signal: "FAN-OUT", dir: "out" },
] as const;

const COLS = [
  { x: 90, ids: ["ACC-2213", "ACC-2380", "ACC-2416", "ACC-2541"] },
  { x: 300, ids: ["ACC-4471"] },
  { x: 470, ids: ["ACC-5102", "ACC-5177", "ACC-5230"] },
];

export function InvestigateSection() {
  return (
    <SectionShell index="05" label="Investigate">
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold display-tight text-ink">
                Follow the money,
                <br />
                node by node.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
                Inspect account relationships, transaction paths, connected
                entities, and the full timeline — without leaving the case.
                Selecting a node re-frames the evidence around it.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="border-b border-line px-5 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Account network · MT-2026-0847
                </span>
              </div>
              <svg viewBox="0 0 560 240" className="w-full" role="img" aria-label="Investigation network">
                {COLS[0].ids.map((id, i) => (
                  <g key={id}>
                    <line x1="104" y1={44 + i * 52} x2="288" y2="120" stroke="var(--line-strong)" />
                  </g>
                ))}
                {COLS[2].ids.map((id, i) => (
                  <g key={id}>
                    <line x1="312" y1="120" x2="456" y2={70 + i * 52} stroke="var(--line-strong)" />
                  </g>
                ))}
                <path d="M 456 174 C 380 226, 180 226, 106 148" fill="none" stroke="var(--tone-danger)" strokeDasharray="3 4" />
                {COLS[0].ids.map((id, i) => (
                  <g key={id}>
                    <circle cx="90" cy={44 + i * 52} r="8" fill="var(--subtle)" stroke="var(--line-strong)" />
                    <text x="90" y={44 + i * 52 + 24} fontSize="9" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-plex-mono)">
                      {id}
                    </text>
                  </g>
                ))}
                <circle cx="300" cy="120" r="14" fill="var(--celery)" />
                <text x="300" y="152" fontSize="10" textAnchor="middle" fill="var(--fg)" fontWeight="600" fontFamily="var(--font-sans)">
                  ACC-4471
                </text>
                {COLS[2].ids.map((id, i) => (
                  <g key={id}>
                    <circle cx="470" cy={70 + i * 52} r="8" fill="var(--subtle)" stroke="var(--line-strong)" />
                    <text x="470" y={70 + i * 52 + 24} fontSize="9" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-plex-mono)">
                      {id}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="divide-y divide-line border-t border-line">
                {ROWS.map((row) => (
                  <div key={row.time + row.pair} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-12 shrink-0 font-mono text-[11px] text-faint">{row.time}</span>
                    {row.dir === "in" ? (
                      <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 truncate font-mono text-[11px] text-muted">{row.pair}</span>
                    <span className="ml-auto font-mono text-[11px] font-medium text-ink tnum">{row.amount}</span>
                    <span className="hidden w-16 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-faint sm:block">
                      {row.signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
