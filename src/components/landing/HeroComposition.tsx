"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react";

/**
 * A carefully composed, static representation of the actual investigation
 * interface: Risk → Explanation → Network → Timeline. The interface itself is
 * the hero visual — no decorative networks, no particles.
 */

const GRAPH_NODES = {
  subject: { x: 300, y: 128, label: "ACC-4471", name: "Northbridge Logistics" },
  sources: [
    { x: 84, y: 34, label: "ACC-2213", risk: "low" },
    { x: 64, y: 78, label: "ACC-2380", risk: "low" },
    { x: 52, y: 122, label: "ACC-2416", risk: "med" },
    { x: 64, y: 166, label: "ACC-2541", risk: "low" },
    { x: 84, y: 210, label: "ACC-2664", risk: "med" },
  ],
  destinations: [
    { x: 516, y: 74, label: "ACC-5102", risk: "high" },
    { x: 536, y: 128, label: "ACC-5177", risk: "high" },
    { x: 528, y: 182, label: "ACC-5230", risk: "med" },
  ],
} as const;

const TIMELINE_ROWS = [
  { time: "09:41:22", from: "ACC-2213", to: "ACC-4471", amount: "$48,250", signal: "FAN-IN", dir: "in" },
  { time: "09:44:05", from: "ACC-2380", to: "ACC-4471", amount: "$31,900", signal: "FAN-IN", dir: "in" },
  { time: "10:02:48", from: "ACC-4471", to: "ACC-5102", amount: "$64,000", signal: "FAN-OUT", dir: "out" },
] as const;

const FACTORS = [
  { label: "14 accounts consolidated funds", weight: 82 },
  { label: "Distributed to 9 downstream accounts", weight: 64 },
  { label: "Transfers within short intervals", weight: 55 },
  { label: "Circular movement detected", weight: 47 },
] as const;

function nodeFill(risk: "low" | "med" | "high") {
  switch (risk) {
    case "high":
      return "var(--tone-danger)";
    case "med":
      return "var(--tone-warn)";
    default:
      return "var(--faint)";
  }
}

export function HeroComposition() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[1080px]"
    >
      <motion.div
        style={{ willChange: "transform" }}
        className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_80px_-32px_rgba(0,0,0,0.5)]"
      >
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-faint">MT-2026-0847</span>
            <span className="h-3 w-px bg-line" />
            <span className="text-[13px] font-semibold text-ink">Northbridge Logistics</span>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Open
            </span>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-faint sm:block">
            Investigation
          </span>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr]">
          {/* Risk + explanation */}
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Risk score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-ink tnum">
                87
              </span>
              <span className="text-sm text-faint tnum">/ 100</span>
            </div>
            <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-danger">
              High risk
            </p>
            <div className="mt-3 h-1 w-full rounded-full bg-line">
              <div className="h-1 w-[87%] rounded-full bg-danger" />
            </div>

            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Why flagged
            </p>
            <ul className="mt-3 space-y-3">
              {FACTORS.map((f) => (
                <li key={f.label}>
                  <p className="text-[13px] leading-snug text-muted">{f.label}</p>
                  <div className="mt-1.5 h-[3px] w-full rounded-full bg-line">
                    <div className="h-[3px] rounded-full bg-celery" style={{ width: `${f.weight}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Network + timeline */}
          <div className="min-w-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                Account network
              </span>
              <span className="font-mono text-[10px] text-faint tnum">24 accounts · 26 transfers</span>
            </div>
            <div className="px-2 py-2">
              <svg viewBox="0 0 600 256" className="h-[230px] w-full" role="img" aria-label="Account network">
                {/* edges */}
                {GRAPH_NODES.sources.map((s) => (
                  <line
                    key={s.label}
                    x1={s.x + 10}
                    y1={s.y + 5}
                    x2={GRAPH_NODES.subject.x - 8}
                    y2={GRAPH_NODES.subject.y}
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                ))}
                {GRAPH_NODES.destinations.map((d) => (
                  <line
                    key={d.label}
                    x1={GRAPH_NODES.subject.x + 8}
                    y1={GRAPH_NODES.subject.y}
                    x2={d.x - 10}
                    y2={d.y + 5}
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                ))}
                {/* circular return */}
                <path
                  d="M 516 186 C 430 250, 190 250, 92 216"
                  fill="none"
                  stroke="var(--tone-danger)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.7"
                />
                {/* nodes */}
                {GRAPH_NODES.sources.map((s) => (
                  <g key={s.label}>
                    <circle cx={s.x} cy={s.y + 5} r="9" fill="var(--surface)" stroke="var(--line-strong)" />
                    <circle cx={s.x} cy={s.y + 5} r="3.5" fill={nodeFill(s.risk)} />
                    <text x={s.x + 15} y={s.y + 8} fontSize="8.5" fill="var(--muted)" fontFamily="var(--font-plex-mono)">
                      {s.label}
                    </text>
                  </g>
                ))}
                <g>
                  <circle
                    cx={GRAPH_NODES.subject.x}
                    cy={GRAPH_NODES.subject.y}
                    r="16"
                    fill="var(--celery)"
                    stroke="var(--celery)"
                  />
                  <text
                    x={GRAPH_NODES.subject.x}
                    y={GRAPH_NODES.subject.y + 32}
                    fontSize="9.5"
                    fill="var(--fg)"
                    textAnchor="middle"
                    fontWeight="600"
                    fontFamily="var(--font-sans)"
                  >
                    ACC-4471
                  </text>
                </g>
                {GRAPH_NODES.destinations.map((d) => (
                  <g key={d.label}>
                    <circle cx={d.x} cy={d.y + 5} r="9" fill="var(--surface)" stroke="var(--line-strong)" />
                    <circle cx={d.x} cy={d.y + 5} r="3.5" fill={nodeFill(d.risk)} />
                    <text x={d.x - 16} y={d.y + 8} fontSize="8.5" fill="var(--muted)" textAnchor="end" fontFamily="var(--font-plex-mono)">
                      {d.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="border-t border-line">
              <div className="flex items-center justify-between px-5 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Transaction timeline
                </span>
                <span className="font-mono text-[10px] text-faint">SEP 28</span>
              </div>
              <div className="divide-y divide-line border-t border-line">
                {TIMELINE_ROWS.map((row) => (
                  <div key={row.time + row.to} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-16 shrink-0 font-mono text-[11px] text-faint">{row.time}</span>
                    {row.dir === "in" ? (
                      <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 truncate font-mono text-[11px] text-muted">
                      {row.from} → {row.to}
                    </span>
                    <span className="ml-auto font-mono text-[11px] font-medium text-ink tnum">{row.amount}</span>
                    <span className="hidden w-16 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-faint sm:block">
                      {row.signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Audit chip — understated Web3 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -bottom-5 right-6 flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2.5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)]"
      >
        <ShieldCheck className="h-4 w-4 text-positive" />
        <span className="text-xs font-semibold text-ink">Verified on-chain</span>
        <span className="font-mono text-[10px] text-faint">0x9f…e24c</span>
      </motion.div>
    </motion.div>
  );
}
