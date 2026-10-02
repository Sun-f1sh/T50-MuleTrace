/**
 * Mock database for UI development.
 *
 * Data is generated deterministically from a fixed seed and follows the exact
 * shapes defined in `@shared/types`. Analyst decisions are persisted to
 * localStorage so the demo survives reloads. Replaced wholesale by the live
 * Fastify API once `NEXT_PUBLIC_API_URL` is configured.
 */

import type {
  Account,
  Alert,
  AuditRecord,
  CsvUploadJob,
  DetectionPattern,
  Investigation,
  InvestigationStatus,
  RiskFactor,
  RiskLevel,
  Transaction,
} from "@shared/types";
import { riskBand } from "@/lib/utils/risk";

/* ------------------------------ seeded random ----------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 64-char hex digest — stands in for a real SHA-256. */
export function mockHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + input.charCodeAt(i) * (i + 7), 2246822519) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 8; i++) {
    h1 = (Math.imul(h1 ^ (h1 >>> 13), 0x5bd1e995) + i) >>> 0;
    h2 = (Math.imul(h2 ^ (h2 >>> 15), 0x2545f491) + i) >>> 0;
    out += ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

/* --------------------------------- specs ---------------------------------- */

interface CaseSpec {
  id: string;
  caseNumber: string;
  subjectId: string;
  subjectLabel: string;
  sources: number;
  destinations: number;
  circular: number;
  rapid: boolean;
  riskScore: number;
  status: InvestigationStatus;
  decidedDaysAgo?: number;
  decisionNote?: string;
  createdHoursAgo: number;
  dataset: string;
}

const CASE_SPECS: CaseSpec[] = [
  {
    id: "inv_0847",
    caseNumber: "MT-2026-0847",
    subjectId: "ACC-4471",
    subjectLabel: "Northbridge Logistics",
    sources: 14,
    destinations: 9,
    circular: 3,
    rapid: true,
    riskScore: 87,
    status: "open",
    createdHoursAgo: 6,
    dataset: "remit-sep-28.csv",
  },
  {
    id: "inv_0851",
    caseNumber: "MT-2026-0851",
    subjectId: "ACC-3392",
    subjectLabel: "Kestrel Freight",
    sources: 2,
    destinations: 11,
    circular: 0,
    rapid: false,
    riskScore: 91,
    status: "open",
    createdHoursAgo: 26,
    dataset: "remit-sep-28.csv",
  },
  {
    id: "inv_0849",
    caseNumber: "MT-2026-0849",
    subjectId: "ACC-5120",
    subjectLabel: "Atlas Metals",
    sources: 9,
    destinations: 4,
    circular: 1,
    rapid: false,
    riskScore: 74,
    status: "confirmed",
    decidedDaysAgo: 1.4,
    decisionNote: "Layering pattern consistent with known mule network.",
    createdHoursAgo: 41,
    dataset: "remit-sep-27.csv",
  },
  {
    id: "inv_0844",
    caseNumber: "MT-2026-0844",
    subjectId: "ACC-2874",
    subjectLabel: "Verity Imports",
    sources: 6,
    destinations: 3,
    circular: 0,
    rapid: false,
    riskScore: 63,
    status: "open",
    createdHoursAgo: 53,
    dataset: "remit-sep-27.csv",
  },
  {
    id: "inv_0841",
    caseNumber: "MT-2026-0841",
    subjectId: "ACC-6650",
    subjectLabel: "Harbor Point Trading",
    sources: 11,
    destinations: 7,
    circular: 2,
    rapid: true,
    riskScore: 88,
    status: "confirmed",
    decidedDaysAgo: 2.6,
    decisionNote: "Confirmed fan-in structure with circular returns.",
    createdHoursAgo: 70,
    dataset: "remit-sep-26.csv",
  },
  {
    id: "inv_0837",
    caseNumber: "MT-2026-0837",
    subjectId: "ACC-1908",
    subjectLabel: "Bluecrest Retail",
    sources: 5,
    destinations: 2,
    circular: 0,
    rapid: false,
    riskScore: 41,
    status: "cleared",
    decidedDaysAgo: 3.5,
    decisionNote: "Regular supplier settlements — pattern matches payroll history.",
    createdHoursAgo: 96,
    dataset: "remit-sep-25.csv",
  },
  {
    id: "inv_0833",
    caseNumber: "MT-2026-0833",
    subjectId: "ACC-7743",
    subjectLabel: "Meridian Supplies",
    sources: 4,
    destinations: 2,
    circular: 0,
    rapid: false,
    riskScore: 35,
    status: "cleared",
    decidedDaysAgo: 4.7,
    decisionNote: "Low-value recurring transfers, legitimate counterparty set.",
    createdHoursAgo: 122,
    dataset: "remit-sep-24.csv",
  },
  {
    id: "inv_0829",
    caseNumber: "MT-2026-0829",
    subjectId: "ACC-5521",
    subjectLabel: "Cobalt Exchange",
    sources: 8,
    destinations: 6,
    circular: 1,
    rapid: true,
    riskScore: 78,
    status: "open",
    createdHoursAgo: 148,
    dataset: "remit-sep-24.csv",
  },
  {
    id: "inv_0825",
    caseNumber: "MT-2026-0825",
    subjectId: "ACC-3015",
    subjectLabel: "Pine & Co",
    sources: 6,
    destinations: 4,
    circular: 0,
    rapid: false,
    riskScore: 57,
    status: "open",
    createdHoursAgo: 170,
    dataset: "remit-sep-23.csv",
  },
];

const SOURCE_LABELS = [
  "Brightline Media", "Vertex Couriers", "Osu Retail Group", "Delta Fresh Foods",
  "Palisade Consulting", "Quill Stationery Co", "Harmon Freight", "Nimbus Print Works",
  "Solstice Energy", "Kite Mobile", "Ferro Alloys Ltd", "Marrow & Sons",
  "Lattice Data", "Corvid Security", "Tandem Motors", "Foxglove Catering",
  "Redwood Interiors", "Cobalt Exchange",
];

const DEST_LABELS = [
  "Eastvale Holdings", "Tern Trading", "Gullwing Logistics", "Sable Commerce",
  "Northgate Exports", "Vantage Bullion", "Cirrus Payments", "Onyx Materials",
  "Ledger & Vale", "Ashfield Brokers", "Peregrine Capital", "Juniper Trade",
];

/* ------------------------------- generation ------------------------------- */

function accountTitle(id: string, label?: string): string {
  return label ?? id;
}

function buildCase(spec: CaseSpec, rng: () => number, now: number): Investigation {
  const createdAt = new Date(now - spec.createdHoursAgo * 3_600_000).toISOString();
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];
  let accSeq = 1200 + Math.floor(rng() * 400);

  const nextAccountId = () => `ACC-${accSeq++}`;

  const mkAccount = (
    role: Account["role"],
    label?: string,
    risk?: number,
  ): Account => {
    const acc: Account = {
      id: role === "subject" ? spec.subjectId : nextAccountId(),
      label,
      role,
      riskScore: risk ?? 0,
      riskLevel: riskBand(risk ?? 0),
      transactionCount: 0,
      totalInflow: 0,
      totalOutflow: 0,
      currency: "USD",
      firstSeen: new Date(now - 90 * 86_400_000).toISOString(),
      lastSeen: createdAt,
    };
    accounts.push(acc);
    return acc;
  };

  const subject = mkAccount("subject", spec.subjectLabel, spec.riskScore);

  // --- inflow wave -----------------------------------------------------------
  const inflowStart = new Date(new Date(createdAt).getTime() - 30 * 3_600_000);
  const sources: Account[] = [];
  for (let i = 0; i < spec.sources; i++) {
    const risk = 8 + Math.floor(rng() * 38);
    sources.push(mkAccount("source", i < 6 ? SOURCE_LABELS[i % SOURCE_LABELS.length] : undefined, risk));
  }

  // Rapid cases: cluster the first 4 inflows within ~12 minutes.
  const inflowGapMin = spec.rapid ? [4, 3, 5, 2, 95, 140, 220, 60, 180, 240, 40, 120, 200, 90] : null;

  let cursor = inflowStart.getTime();
  const inflows: { tx: Transaction; source: Account; amount: number }[] = [];
  for (let i = 0; i < spec.sources; i++) {
    const amount = Math.round((4_000 + rng() * 86_000) / 50) * 50;
    const gapMin = inflowGapMin ? inflowGapMin[i % inflowGapMin.length] : 40 + rng() * 620;
    cursor += gapMin * 60_000;
    const source = sources[i];
    const tx: Transaction = {
      id: `tx_${spec.id}_in_${i}`,
      sourceAccountId: source.id,
      targetAccountId: subject.id,
      amount,
      currency: "USD",
      timestamp: new Date(cursor).toISOString(),
      signals: ["fan-in"],
    };
    if (spec.rapid && i < 4) tx.signals.push("rapid-inflow-outflow");
    transactions.push(tx);
    inflows.push({ tx, source, amount });
  }

  // --- outflow wave ----------------------------------------------------------
  let outCursor = cursor + (5 + rng() * 35) * 60_000;
  const destinations: Account[] = [];
  for (let i = 0; i < spec.destinations; i++) {
    destinations.push(mkAccount("destination", i < 4 ? DEST_LABELS[i % DEST_LABELS.length] : undefined, 52 + Math.floor(rng() * 30)));
  }
  const outflows: { tx: Transaction; dest: Account; amount: number }[] = [];
  for (let i = 0; i < spec.destinations; i++) {
    const amount = Math.round((2_500 + rng() * 62_000) / 50) * 50;
    outCursor += (spec.rapid ? 4 + rng() * 14 : 18 + rng() * 120) * 60_000;
    const dest = destinations[i];
    const tx: Transaction = {
      id: `tx_${spec.id}_out_${i}`,
      sourceAccountId: subject.id,
      targetAccountId: dest.id,
      amount,
      currency: "USD",
      timestamp: new Date(outCursor).toISOString(),
      signals: ["fan-out"],
    };
    if (spec.rapid) tx.signals.push("rapid-inflow-outflow");
    transactions.push(tx);
    outflows.push({ tx, dest, amount });
  }

  // --- circular returns ------------------------------------------------------
  const circulars: Transaction[] = [];
  for (let i = 0; i < spec.circular; i++) {
    const dest = destinations[(i * 3 + 1) % destinations.length];
    const src = sources[(i * 5 + 2) % sources.length];
    if (!dest || !src || dest.id === src.id) continue;
    const amount = Math.round((1_800 + rng() * 14_000) / 50) * 50;
    const tx: Transaction = {
      id: `tx_${spec.id}_cir_${i}`,
      sourceAccountId: dest.id,
      targetAccountId: src.id,
      amount,
      currency: "USD",
      timestamp: new Date(outCursor + (40 + i * 55) * 60_000).toISOString(),
      signals: ["circular"],
    };
    transactions.push(tx);
    circulars.push(tx);
  }

  // --- aggregate account stats ------------------------------------------------
  for (const tx of transactions) {
    const src = accounts.find((a) => a.id === tx.sourceAccountId);
    const dst = accounts.find((a) => a.id === tx.targetAccountId);
    if (src) {
      src.totalOutflow += tx.amount;
      src.transactionCount += 1;
      src.lastSeen = tx.timestamp > src.lastSeen ? tx.timestamp : src.lastSeen;
    }
    if (dst) {
      dst.totalInflow += tx.amount;
      dst.transactionCount += 1;
      dst.lastSeen = tx.timestamp > dst.lastSeen ? tx.timestamp : dst.lastSeen;
    }
  }

  // --- risk factors ------------------------------------------------------------
  const totalIn = inflows.reduce((s, i) => s + i.amount, 0);
  const totalOut = outflows.reduce((s, o) => s + o.amount, 0);
  const factors: RiskFactor[] = [];

  if (spec.sources >= 4) {
    factors.push({
      id: `${spec.id}_f_fanin`,
      pattern: "fan-in",
      title: "Funds consolidated from many accounts",
      description: `${spec.sources} accounts transferred funds into ${spec.subjectLabel} within a 30-hour window.`,
      weight: 32,
      evidence: { accountsInvolved: spec.sources, transactionsInvolved: inflows.length, totalAmount: totalIn },
    });
  }
  if (spec.destinations >= 2) {
    factors.push({
      id: `${spec.id}_f_fanout`,
      pattern: "fan-out",
      title: "Funds distributed to downstream accounts",
      description: `Funds were distributed to ${spec.destinations} downstream accounts shortly after arrival.`,
      weight: 26,
      evidence: { accountsInvolved: spec.destinations, transactionsInvolved: outflows.length, totalAmount: totalOut },
    });
  }
  if (spec.rapid) {
    factors.push({
      id: `${spec.id}_f_rapid`,
      pattern: "rapid-inflow-outflow",
      title: "Transfers within short intervals",
      description: `Multiple transfers occurred within short intervals — 4 inflows landed within 12 minutes, followed by rapid dispersal.`,
      weight: 22,
      evidence: { accountsInvolved: spec.sources + spec.destinations, transactionsInvolved: 8, totalAmount: Math.round(totalIn * 0.42) },
    });
  }
  if (circulars.length > 0) {
    factors.push({
      id: `${spec.id}_f_circular`,
      pattern: "circular",
      title: "Circular movement detected",
      description: `Circular movement detected across connected accounts — funds returned to earlier senders through ${circulars.length} transfer${circulars.length === 1 ? "" : "s"}.`,
      weight: 20,
      evidence: {
        accountsInvolved: circulars.length * 2,
        transactionsInvolved: circulars.length,
        totalAmount: circulars.reduce((s, c) => s + c.amount, 0),
      },
    });
  }

  // --- graph -------------------------------------------------------------------
  const graphNodes = [
    { id: subject.id },
    ...sources.map((a) => ({ id: a.id })),
    ...destinations.map((a) => ({ id: a.id })),
  ];
  const graphEdges = [
    ...inflows.map((i) => ({
      id: `e_${i.tx.id}`,
      source: i.source.id,
      target: subject.id,
      transactionIds: [i.tx.id],
      totalAmount: i.amount,
    })),
    ...outflows.map((o) => ({
      id: `e_${o.tx.id}`,
      source: subject.id,
      target: o.dest.id,
      transactionIds: [o.tx.id],
      totalAmount: o.amount,
    })),
    ...circulars.map((c) => ({
      id: `e_${c.id}`,
      source: c.sourceAccountId,
      target: c.targetAccountId,
      transactionIds: [c.id],
      totalAmount: c.amount,
    })),
  ];

  const decidedAt = spec.decidedDaysAgo
    ? new Date(now - spec.decidedDaysAgo * 86_400_000).toISOString()
    : undefined;

  return {
    id: spec.id,
    caseNumber: spec.caseNumber,
    subjectAccountId: subject.id,
    status: spec.status,
    riskScore: spec.riskScore,
    riskLevel: riskBand(spec.riskScore),
    summary:
      spec.riskScore >= 80
        ? "Consolidation of funds from multiple sources followed by rapid distribution."
        : spec.riskScore >= 60
          ? "Structured transfer activity with mixed counterparties."
          : "Low-value recurring activity across a small counterparty set.",
    riskFactors: factors,
    accounts,
    transactions,
    graph: { focusAccountId: subject.id, nodes: graphNodes, edges: graphEdges },
    datasetName: spec.dataset,
    currency: "USD",
    flaggedVolume: subject.totalInflow,
    decidedAt,
    decidedBy: spec.decidedDaysAgo ? "R. Okafor" : undefined,
    decisionNote: spec.decisionNote,
    createdAt,
    updatedAt: decidedAt ?? createdAt,
  };
}

/* ------------------------------ audit records ------------------------------ */

export function buildAuditRecord(inv: Investigation, decision: "confirmed" | "cleared"): AuditRecord {
  const decidedAt = inv.decidedAt ?? new Date().toISOString();
  return {
    investigationId: inv.caseNumber,
    decision,
    decidedBy: inv.decidedBy ?? "You",
    decidedAt,
    resultHash: mockHash(`result:${inv.id}:${decision}:${Math.floor(new Date(decidedAt).getTime() / 1000)}`),
    transactionHash: mockHash(`chain:${inv.id}:${decision}`),
    chainId: "muletrace-audit-1",
    blockNumber: 1_842_000 + (Math.abs(mockHash(inv.id).charCodeAt(0) * 997) % 90_000),
    verificationStatus: "verified",
    verifiedAt: new Date(new Date(decidedAt).getTime() + 90_000).toISOString(),
  };
}

/* --------------------------------- assembly -------------------------------- */

function seedInvestigations(now: number): Investigation[] {
  const rng = mulberry32(4217);
  return CASE_SPECS.map((spec) => buildCase(spec, rng, now));
}

function seedAlerts(investigations: Investigation[], now: number): Alert[] {
  return investigations.map((inv) => {
    const ageH = (now - new Date(inv.createdAt).getTime()) / 3_600_000;
    const status: Alert["status"] =
      inv.status !== "open" ? "resolved" : ageH < 48 ? "new" : "in-review";
    const primary: DetectionPattern = inv.riskFactors[0]?.pattern ?? "fan-in";
    return {
      id: `alr_${inv.id}`,
      investigationId: inv.id,
      accountId: inv.subjectAccountId,
      primaryPattern: primary,
      riskScore: inv.riskScore,
      riskLevel: inv.riskLevel,
      flaggedVolume: inv.accounts.find((a) => a.id === inv.subjectAccountId)?.totalInflow ?? 0,
      currency: "USD",
      transactionCount: inv.transactions.length,
      status,
      detectedAt: inv.createdAt,
    };
  });
}

/* ------------------------- persistence (decisions) -------------------------- */

const STORAGE_KEY = "muletrace.mock.decisions.v1";
const UPLOADS_KEY = "muletrace.mock.uploads.v1";

interface DecisionOverride {
  decision: "confirmed" | "cleared";
  note?: string;
  analyst: string;
  decidedAt: string;
}

function loadOverrides(): Record<string, DecisionOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveOverrides(all: Record<string, DecisionOverride>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadUploads(): CsvUploadJob[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(UPLOADS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUploads(jobs: CsvUploadJob[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UPLOADS_KEY, JSON.stringify(jobs.slice(0, 8)));
}

export function applyDecision(inv: Investigation, ov: DecisionOverride): Investigation {
  const status: InvestigationStatus = ov.decision === "confirmed" ? "confirmed" : "cleared";
  return {
    ...inv,
    status,
    decidedBy: ov.analyst,
    decidedAt: ov.decidedAt,
    decisionNote: ov.note,
    updatedAt: ov.decidedAt,
    audit: buildAuditRecord(inv, ov.decision),
  };
}

/* ---------------------------------- store ---------------------------------- */

export interface MockDb {
  investigations: Investigation[];
  alerts: Alert[];
  uploads: CsvUploadJob[];
}

let cached: MockDb | null = null;

export function getDb(): MockDb {
  if (cached) return cached;
  const now = Date.now();
  let investigations = seedInvestigations(now);
  const overrides = loadOverrides();
  investigations = investigations.map((inv) => {
    const ov = overrides[inv.id];
    return ov
      ? applyDecision(inv, ov)
      : inv;
  });
  cached = {
    investigations,
    alerts: seedAlerts(investigations, now),
    uploads: loadUploads(),
  };
  return cached;
}

export function recordDecision(invId: string, ov: DecisionOverride): void {
  const all = loadOverrides();
  all[invId] = ov;
  saveOverrides(all);
  const db = getDb();
  const inv = db.investigations.find((i) => i.id === invId);
  if (inv) {
    Object.assign(inv, applyDecision(inv, ov));
    const alert = db.alerts.find((a) => a.investigationId === invId);
    if (alert) alert.status = "resolved";
  }
}

export function addUploadJob(job: CsvUploadJob): void {
  const db = getDb();
  db.uploads.unshift(job);
  saveUploads(db.uploads);
  const all = loadUploads();
  const idx = all.findIndex((j) => j.id === job.id);
  if (idx >= 0) all[idx] = job;
  else all.unshift(job);
  saveUploads(all);
}

export function resetMockDb(): void {
  cached = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(UPLOADS_KEY);
  }
}

export { accountTitle };
export type { RiskLevel };
