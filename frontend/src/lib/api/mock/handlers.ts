/**
 * Mock implementations of the API surface. Signatures mirror the live REST
 * endpoints one-to-one so the client can switch modes without UI changes.
 */

import type {
  Alert,
  AuditRecord,
  CsvUploadJob,
  DashboardSummary,
  DecisionRequest,
  DecisionResponse,
  Investigation,
  InvestigationSummary,
} from "@shared/types";
import { addUploadJob, getDb, recordDecision } from "./db";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockGetDashboardSummary(): Promise<DashboardSummary> {
  await delay(260);
  const db = getDb();
  const now = Date.now();
  const open = db.investigations.filter((i) => i.status === "open");
  const confirmed = db.investigations.filter((i) => i.status === "confirmed");
  const cleared = db.investigations.filter((i) => i.status === "cleared");
  const activeAlerts = db.alerts.filter((a) => a.status !== "resolved").length;
  const newToday = db.alerts.filter(
    (a) => now - new Date(a.detectedAt).getTime() < 86_400_000,
  ).length;

  return {
    activeAlerts,
    newAlertsToday: newToday,
    highRiskInvestigations: open.filter((i) => i.riskLevel === "high" || i.riskLevel === "critical").length,
    openInvestigations: open.length,
    confirmedInvestigations: confirmed.length,
    clearedInvestigations: cleared.length,
    flaggedVolume: db.alerts
      .filter((a) => a.status !== "resolved")
      .reduce((s, a) => s + a.flaggedVolume, 0),
    currency: "USD",
    recentInvestigations: db.investigations
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(toSummary),
  };
}

export async function mockGetAlerts(): Promise<Alert[]> {
  await delay(300);
  return getDb()
    .alerts.slice()
    .sort((a, b) => {
      if (a.status === "resolved" !== (b.status === "resolved")) {
        return a.status === "resolved" ? 1 : -1;
      }
      return b.riskScore - a.riskScore;
    });
}

export async function mockGetInvestigations(): Promise<InvestigationSummary[]> {
  await delay(280);
  return getDb()
    .investigations.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSummary);
}

export async function mockGetInvestigation(id: string): Promise<Investigation> {
  await delay(340);
  const inv = getDb().investigations.find((i) => i.id === id || i.caseNumber === id);
  if (!inv) {
    const err = new Error(`Investigation ${id} not found`);
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return inv;
}

export async function mockSubmitDecision(
  id: string,
  request: DecisionRequest,
): Promise<DecisionResponse> {
  await delay(620);
  const inv = getDb().investigations.find((i) => i.id === id || i.caseNumber === id);
  if (!inv) {
    const err = new Error(`Investigation ${id} not found`);
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (inv.status !== "open") {
    const err = new Error("This investigation has already been decided.");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }
  const decidedAt = new Date().toISOString();
  recordDecision(inv.id, {
    decision: request.decision,
    note: request.note,
    analyst: request.analyst ?? "You",
    decidedAt,
  });
  const updated = getDb().investigations.find((i) => i.id === id)!;
  return { investigation: updated, audit: updated.audit! };
}

export async function mockGetAuditRecords(): Promise<AuditRecord[]> {
  await delay(260);
  return getDb()
    .investigations.filter((i) => i.audit)
    .sort((a, b) => (b.audit!.decidedAt ?? "").localeCompare(a.audit!.decidedAt ?? ""))
    .map((i) => i.audit!);
}

let uploadSeq = 0;

/** Simulated CSV pipeline: queued → processing (row ticks) → completed. */
export async function mockUploadCsv(
  fileName: string,
  sizeBytes: number,
  onUpdate: (job: CsvUploadJob) => void,
): Promise<CsvUploadJob> {
  const id = `upl_${Date.now()}_${uploadSeq++}`;
  const rowsTotal = 800 + Math.floor(Math.random() * 4200);
  let job: CsvUploadJob = {
    id,
    fileName,
    sizeBytes,
    status: "queued",
    rowsTotal,
    createdAt: new Date().toISOString(),
  };
  addUploadJob(job);
  onUpdate(job);

  await delay(700);
  job = { ...job, status: "processing", rowsProcessed: 0 };
  addUploadJob(job);
  onUpdate(job);

  const steps = 9;
  for (let i = 1; i <= steps; i++) {
    await delay(360 + Math.random() * 220);
    job = { ...job, rowsProcessed: Math.round((rowsTotal * i) / steps) };
    addUploadJob(job);
    onUpdate(job);
  }

  const alertsCreated = 2 + Math.floor(Math.random() * 4);
  const finalJob: CsvUploadJob = {
    ...job,
    status: "completed",
    rowsProcessed: rowsTotal,
    alertsCreated,
    investigationsCreated: alertsCreated,
    completedAt: new Date().toISOString(),
  };
  addUploadJob(finalJob);
  onUpdate(finalJob);
  return finalJob;
}

function toSummary(inv: Investigation): InvestigationSummary {
  return {
    id: inv.id,
    caseNumber: inv.caseNumber,
    subjectAccountId: inv.subjectAccountId,
    riskScore: inv.riskScore,
    riskLevel: inv.riskLevel,
    status: inv.status,
    primaryPattern: inv.riskFactors[0]?.pattern ?? "fan-in",
    flaggedVolume: inv.accounts.find((a) => a.id === inv.subjectAccountId)?.totalInflow ?? 0,
    currency: "USD",
    accountCount: inv.accounts.length,
    transactionCount: inv.transactions.length,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    auditVerified: inv.audit?.verificationStatus === "verified",
  };
}

export async function mockGetDatasets() {
  await delay(200);
  return [
    {
      id: "eedala-paysim",
      name: "Eedala / PaySim Synthetic Financial Datasets",
      url: "https://www.kaggle.com/datasets/ealaxi/paysim1",
      description: "Mobile money financial transactions simulation dataset based on sample of real transactions. Maps step, type, amount, nameOrig, nameDest, and isFraud.",
      imports: [
        {
          id: "imp_paysim_01",
          filename: "paysim_sample_250k.csv",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          rowsTotal: 250000,
          rowsProcessed: 250000,
          duplicates: 42,
          invalid: 0,
          labelColumn: "isFraud",
          labeledRows: 250000,
          fraudLabels: 284,
          metrics: { rocAuc: 0.984, prAuc: 0.942, f1: 0.923 },
          provenance: {
            sourceUrl: "https://www.kaggle.com/datasets/ealaxi/paysim1",
            uploadedBy: "Analyst · R. Okafor",
            sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            schemaHeaders: ["step", "type", "amount", "nameOrig", "oldbalanceOrg", "newbalanceOrig", "nameDest", "oldbalanceDest", "newbalanceDest", "isFraud"],
          },
        },
      ],
    },
    {
      id: "thuandao",
      name: "Thuandao Bank Fraud Detection",
      url: "https://www.kaggle.com/datasets/thuandao/bank-fraud-detection",
      description: "Financial bank transactions dataset with suspicious account flags, merchant categories, amounts, and geographic indicators.",
      imports: [
        {
          id: "imp_thuan_01",
          filename: "thuandao_bank_tx.csv",
          createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          rowsTotal: 84000,
          rowsProcessed: 84000,
          duplicates: 18,
          invalid: 0,
          labelColumn: "fraud_bool",
          labeledRows: 84000,
          fraudLabels: 112,
          metrics: { rocAuc: 0.971, prAuc: 0.915, f1: 0.898 },
          provenance: {
            sourceUrl: "https://www.kaggle.com/datasets/thuandao/bank-fraud-detection",
            uploadedBy: "Analyst · R. Okafor",
            sha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            schemaHeaders: ["transaction_id", "source_acc", "dest_acc", "amt", "currency", "timestamp", "fraud_bool"],
          },
        },
      ],
    },
    {
      id: "yogesh-tekawade",
      name: "Yogesh Tekawade Financial Transaction Data",
      url: "https://www.kaggle.com/datasets/yogeshtekawade/financial-transaction-data",
      description: "Transaction records covering customer demographics, account and investment types. Unsupervised anomaly scoring enabled.",
      imports: [
        {
          id: "imp_yogesh_01",
          filename: "customer_transactions_clean.csv",
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          rowsTotal: 45000,
          rowsProcessed: 45000,
          duplicates: 5,
          invalid: 0,
          labelColumn: null,
          labeledRows: 0,
          fraudLabels: 0,
          metrics: null,
          provenance: {
            sourceUrl: "https://www.kaggle.com/datasets/yogeshtekawade/financial-transaction-data",
            uploadedBy: "System Auto-Ingest",
            sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
            schemaHeaders: ["tx_id", "cust_id", "acc_num", "tx_amount", "tx_type", "date_time"],
          },
        },
      ],
    },
  ];
}

export async function mockGetModelMetrics() {
  await delay(250);
  return {
    model: "Balanced Random Forest + IsolationForest Ensemble v2.4",
    evaluationMethod: "Stratified 5-Fold Cross-Validation with held-out leave-one-feature-out attribution",
    blockchainConfigured: true,
    evaluations: [
      {
        batchId: "imp_paysim_01",
        sourceId: "eedala-paysim",
        filename: "paysim_sample_250k.csv",
        status: "evaluated",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        method: "Stratified 5-Fold CV",
        precision: 0.931,
        recall: 0.915,
        f1: 0.923,
        prAuc: 0.942,
        rocAuc: 0.984,
        labeledRows: 250000,
        fraudLabels: 284,
        confusionMatrix: { tn: 249680, fp: 36, fn: 24, tp: 260 },
      },
      {
        batchId: "imp_thuan_01",
        sourceId: "thuandao",
        filename: "thuandao_bank_tx.csv",
        status: "evaluated",
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        method: "Stratified 5-Fold CV",
        precision: 0.908,
        recall: 0.889,
        f1: 0.898,
        prAuc: 0.915,
        rocAuc: 0.971,
        labeledRows: 84000,
        fraudLabels: 112,
        confusionMatrix: { tn: 83870, fp: 18, fn: 12, tp: 100 },
      },
      {
        batchId: "imp_yogesh_01",
        sourceId: "yogesh-tekawade",
        filename: "customer_transactions_clean.csv",
        status: "unsupervised_anomaly_only",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        method: "IsolationForest (Robust Quantile Scaling)",
        precision: null,
        recall: null,
        f1: null,
        prAuc: null,
        rocAuc: null,
        labeledRows: 0,
        fraudLabels: 0,
        reason: "Source lacks ground-truth fraud labels; scored strictly via IsolationForest anomaly percentile and flow-rule outliers.",
        confusionMatrix: null,
      },
    ],
    versions: [
      {
        versionId: "ver_rf_paysim_20261003",
        batchId: "imp_paysim_01",
        sha256: "7d4a13e2f5b6c8910123456789abcdef0123456789abcdef0123456789abcdef",
        model: "RandomForestClassifier(n_estimators=100, class_weight='balanced')",
        artifactSha256: "3e25960a79dbc69b674cd4ec67a72c62d81d8654a49bc2852904acbc73b4b5dd",
        artifactStatus: "persisted",
        transactionHash: "0x89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
        chainId: "11155111",
        blockNumber: 6842109,
        verificationStatus: "verified" as const,
        verifiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        onChainVerified: true,
        verified: true,
      },
      {
        versionId: "ver_rf_thuan_20261003",
        batchId: "imp_thuan_01",
        sha256: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        model: "RandomForestClassifier(n_estimators=100, class_weight='balanced')",
        artifactSha256: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
        artifactStatus: "persisted",
        transactionHash: "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
        chainId: "11155111",
        blockNumber: 6841920,
        verificationStatus: "verified" as const,
        verifiedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        onChainVerified: true,
        verified: true,
      },
    ],
  };
}

export async function mockGetCrossSourceIntelligence() {
  await delay(200);
  return {
    candidateCount: 3,
    method: "Keyed HMAC-SHA256 fingerprint matching across isolated source accounts without raw PII exposure",
    limitation: "Candidate matches indicate structural account identifier collisions between independent batches, not verified KYC identity equivalence.",
    candidateMatches: [
      {
        fingerprint: "hmac_sha256:4a8b9f...3e2c",
        sourceProfiles: ["eedala-paysim", "thuandao"],
        sourceDatasetNames: ["PaySim Synthetic 250k", "Thuandao Bank Fraud"],
        occurrences: 48,
        flaggedVolume: 428900,
        highestRiskScore: 94,
        currency: "USD",
        interpretation: "Account identifier collided across PaySim high-fan-out hub and Thuandao mule flagged accounts.",
      },
      {
        fingerprint: "hmac_sha256:b7c3d1...8f0a",
        sourceProfiles: ["thuandao", "yogesh-tekawade"],
        sourceDatasetNames: ["Thuandao Bank Fraud", "Yogesh Tekawade Clean"],
        occurrences: 19,
        flaggedVolume: 185000,
        highestRiskScore: 82,
        currency: "USD",
        interpretation: "Collided intermediary transit account with circular flow pattern identified across two imports.",
      },
      {
        fingerprint: "hmac_sha256:e1f9a2...5d4b",
        sourceProfiles: ["eedala-paysim", "yogesh-tekawade"],
        sourceDatasetNames: ["PaySim Synthetic 250k", "Yogesh Tekawade Clean"],
        occurrences: 12,
        flaggedVolume: 92400,
        highestRiskScore: 78,
        currency: "mixed",
        interpretation: "Rapid inflow-outflow aggregator node identified in multiple batch snapshots.",
      },
    ],
  };
}

export async function mockGetBlockchainStatus() {
  await delay(150);
  return {
    configured: true,
    chainId: "11155111",
    contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    mode: "Sepolia Testnet / Verified Contract",
    warning: null,
  };
}

export async function mockVerifyAudit(id: string) {
  await delay(350);
  const records = await mockGetAuditRecords();
  const rec = records.find((a) => a.investigationId === id) ?? records[0] ?? {
    investigationId: id,
    decision: "confirmed" as const,
    decidedBy: "Analyst · R. Okafor",
    decidedAt: new Date().toISOString(),
    resultHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    transactionHash: "0x89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    chainId: "11155111",
    blockNumber: 6842109,
    verificationStatus: "verified" as const,
  };
  return {
    ...rec,
    offchainHashMatches: true,
    onChainVerified: true,
    verified: true,
    verificationStatus: "verified" as const,
  };
}

export async function mockAnchorModelVersion(id: string) {
  await delay(450);
  return {
    versionId: id,
    batchId: "imp_active",
    sha256: "7d4a13e2f5b6c8910123456789abcdef0123456789abcdef0123456789abcdef",
    model: "RandomForestClassifier",
    artifactSha256: "3e25960a79dbc69b674cd4ec67a72c62d81d8654a49bc2852904acbc73b4b5dd",
    artifactStatus: "persisted",
    transactionHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    chainId: "11155111",
    blockNumber: 6842115,
    verificationStatus: "verified" as const,
    verifiedAt: new Date().toISOString(),
    onChainVerified: true,
    verified: true,
  };
}

export async function mockVerifyModelVersion(id: string) {
  return mockAnchorModelVersion(id);
}
