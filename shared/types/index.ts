/**
 * MuleTrace shared domain types.
 *
 * This module is the single source of truth for the API contract between the
 * FastAPI backend and this frontend. The frontend must never redefine these —
 * it imports them from `@shared/types`.
 */

/* ---------------------------------- Risk --------------------------------- */

export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Detection patterns produced by the fraud-detection engine. */
export type DetectionPattern =
  | "fan-in"
  | "fan-out"
  | "circular"
  | "rapid-inflow-outflow"
  | "amount-outlier"
  | "anomaly-score";

export const DETECTION_PATTERN_LABELS: Record<DetectionPattern, string> = {
  "fan-in": "Many → One",
  "fan-out": "One → Many",
  circular: "Circular transfer",
  "rapid-inflow-outflow": "Rapid in → out",
  "amount-outlier": "Amount outlier",
  "anomaly-score": "Model anomaly",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  critical: "Critical",
};

/* -------------------------------- Entities -------------------------------- */

export interface Account {
  id: string;
  /** Optional human label, e.g. a bank name or merchant. */
  label?: string;
  riskScore: number; // 0–100
  riskLevel: RiskLevel;
  transactionCount: number;
  totalInflow: number;
  totalOutflow: number;
  currency: string; // source value or "units" when absent
  firstSeen: string; // ISO timestamp or empty when unavailable
  lastSeen: string; // ISO timestamp or empty when unavailable
  /** Role within an investigation graph, when assigned. */
  role?: "subject" | "source" | "intermediary" | "destination";
}

export interface Transaction {
  id: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  currency: string;
  timestamp: string; // ISO or source-relative step:N; empty when unavailable
  /** Signals the detection engine attached to this transaction. */
  signals: DetectionPattern[];
}

export interface RiskFactor {
  id: string;
  pattern: DetectionPattern;
  /** Human-readable title, e.g. "Funds consolidated from many accounts". */
  title: string;
  /** Human-readable explanation the analyst can read without raw data. */
  description: string;
  /** Relative contribution of this factor to the risk score (0–100). */
  weight: number;
  /** Numbers backing the explanation. */
  evidence: {
    accountsInvolved: number;
    transactionsInvolved: number;
    totalAmount: number;
  };
}

/* ------------------------------ Graph payload ----------------------------- */

export interface GraphNode {
  id: string; // account id
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string; // account id
  target: string; // account id
  transactionIds: string[];
  totalAmount: number;
}

export interface InvestigationGraph {
  focusAccountId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------ Investigations ---------------------------- */

export type InvestigationStatus = "open" | "confirmed" | "cleared";

export interface InvestigationSummary {
  id: string;
  caseNumber: string;
  subjectAccountId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: InvestigationStatus;
  primaryPattern: DetectionPattern;
  flaggedVolume: number;
  currency: string;
  accountCount: number;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
  auditVerified?: boolean;
}

export interface Investigation {
  id: string;
  caseNumber: string;
  subjectAccountId: string;
  status: InvestigationStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  /** Headline explanation, e.g. "Fan-in followed by rapid distribution". */
  summary: string;
  riskFactors: RiskFactor[];
  accounts: Account[];
  transactions: Transaction[];
  graph: InvestigationGraph;
  datasetName?: string;
  currency: string;
  flaggedVolume: number;
  totalTransactionCount?: number;
  totalAccountCount?: number;
  evidenceTruncated?: boolean;
  prediction?: { score: number; modelScore: number | null; label: string; confirmed: boolean; sourceLabel: number | null; featureAttributions: Array<{feature:string;effectPoints?:number;globalImportance?:number;standardizedDeviation?:number;method:string}> };
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  audit?: AuditRecord;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Alerts --------------------------------- */

export type AlertStatus = "new" | "in-review" | "resolved";

export interface Alert {
  id: string;
  investigationId: string;
  accountId: string;
  primaryPattern: DetectionPattern;
  riskScore: number;
  riskLevel: RiskLevel;
  /** Total volume moved through the account within the detection window. */
  flaggedVolume: number;
  currency: string;
  transactionCount: number;
  status: AlertStatus;
  detectedAt: string;
}

/* --------------------------------- Audit ---------------------------------- */

export type AuditVerificationStatus = "pending" | "verified" | "failed";

export interface AuditRecord {
  investigationId: string;
  decision: "confirmed" | "cleared";
  decidedBy: string;
  decidedAt: string;
  /** SHA-256 of the canonical investigation result. */
  resultHash: string;
  /** On-chain transaction hash anchoring the result. */
  transactionHash: string;
  chainId: string;
  blockNumber: number;
  verificationStatus: AuditVerificationStatus;
  verifiedAt?: string;
}

/* ------------------------------- Ingestion -------------------------------- */

export type UploadStatus = "queued" | "processing" | "completed" | "failed";

export interface CsvUploadJob {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: UploadStatus;
  rowsTotal?: number;
  rowsProcessed?: number;
  alertsCreated?: number;
  investigationsCreated?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/* -------------------------------- Dashboard ------------------------------- */

export interface DashboardSummary {
  activeAlerts: number;
  newAlertsToday: number;
  highRiskInvestigations: number;
  openInvestigations: number;
  confirmedInvestigations: number;
  clearedInvestigations: number;
  flaggedVolume: number;
  currency: string;
  recentInvestigations: InvestigationSummary[];
}

/* --------------------------------- Requests ------------------------------- */

export interface DecisionRequest {
  decision: "confirmed" | "cleared";
  note?: string;
  analyst?: string;
}

export interface DecisionResponse {
  investigation: Investigation;
  audit: AuditRecord;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}
