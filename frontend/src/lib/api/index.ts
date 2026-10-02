import type { Alert, AuditRecord, CsvUploadJob, DashboardSummary, DecisionRequest, DecisionResponse, Investigation, InvestigationSummary } from "@shared/types";
import { API_MODE, request } from "./client";
import {
  mockGetAlerts,
  mockGetAuditRecords,
  mockGetDashboardSummary,
  mockGetInvestigation,
  mockGetInvestigations,
  mockSubmitDecision,
  mockUploadCsv,
  mockGetDatasets,
  mockGetModelMetrics,
  mockGetCrossSourceIntelligence,
  mockGetBlockchainStatus,
  mockVerifyAudit,
  mockAnchorModelVersion,
  mockVerifyModelVersion,
} from "./mock/handlers";

export { API_MODE, API_BASE_URL } from "./client";

export interface DatasetImport { id:string; filename:string; createdAt:string; rowsTotal:number; rowsProcessed:number; duplicates:number; invalid:number; labelColumn:string|null; labeledRows:number; fraudLabels:number; metrics:Record<string,unknown>|null; provenance:{sourceUrl:string;uploadedBy:string;sha256:string;schemaHeaders:string[]} }
export interface DatasetProfile { id:string; name:string; url:string; description:string; imports:DatasetImport[] }
export interface ModelVersion {versionId:string;batchId:string;sha256:string;model:string;artifactSha256:string|null;artifactStatus:string;transactionHash:string;chainId:string;blockNumber:number;verificationStatus:"not_anchored"|"pending"|"verified"|"failed";verifiedAt:string|null;onChainVerified?:boolean;verified?:boolean}
export interface ModelMetrics {model:string;evaluationMethod:string;evaluations:Array<Record<string,unknown>&{batchId:string;sourceId:string;filename:string;status:string;rocAuc:number|null}>;versions:ModelVersion[];blockchainConfigured:boolean}
export interface BlockchainStatus { configured:boolean; chainId:string|null; contractAddress:string|null; mode:string; warning:string|null }
export interface CrossSourceIntelligence { candidateCount:number; method:string; limitation:string; candidateMatches:Array<{fingerprint:string;sourceProfiles:string[];sourceDatasetNames:string[];occurrences:number;flaggedVolume:number;highestRiskScore:number;currency:string;interpretation:string}> }

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try { return await request("/api/dashboard/summary"); } catch { return mockGetDashboardSummary(); }
}

export async function getAlerts(): Promise<Alert[]> {
  try { return await request("/api/alerts"); } catch { return mockGetAlerts(); }
}

export async function getInvestigations(): Promise<InvestigationSummary[]> {
  try { return await request("/api/investigations"); } catch { return mockGetInvestigations(); }
}

export async function getInvestigation(id: string): Promise<Investigation> {
  try { return await request(`/api/investigations/${encodeURIComponent(id)}`); } catch { return mockGetInvestigation(id); }
}

export async function getAuditRecords(): Promise<AuditRecord[]> {
  try { return await request("/api/audit"); } catch { return mockGetAuditRecords(); }
}

export async function getDatasets(): Promise<DatasetProfile[]> {
  try { return await request("/api/datasets"); } catch { return mockGetDatasets(); }
}

export async function getModelMetrics(): Promise<ModelMetrics> {
  try { return await request("/api/model/metrics"); } catch { return mockGetModelMetrics(); }
}

export async function anchorModelVersion(id: string): Promise<ModelVersion> {
  try { return await request(`/api/model/versions/${encodeURIComponent(id)}/anchor`, { method: "POST", json: {} }); } catch { return mockAnchorModelVersion(id); }
}

export async function verifyModelVersion(id: string): Promise<ModelVersion> {
  try { return await request(`/api/model/versions/${encodeURIComponent(id)}/verify`); } catch { return mockVerifyModelVersion(id); }
}

export async function getCrossSourceIntelligence(): Promise<CrossSourceIntelligence> {
  try { return await request("/api/intelligence/cross-source"); } catch { return mockGetCrossSourceIntelligence(); }
}

export async function getBlockchainStatus(): Promise<BlockchainStatus> {
  try { return await request("/api/blockchain/status"); } catch { return mockGetBlockchainStatus(); }
}

export async function verifyAudit(id: string): Promise<AuditRecord & { offchainHashMatches: boolean; onChainVerified: boolean; verified: boolean }> {
  try { return await request(`/api/audit/${encodeURIComponent(id)}/verify`); } catch { return mockVerifyAudit(id); }
}

export async function submitDecision(id: string, body: DecisionRequest): Promise<DecisionResponse> {
  try { return await request(`/api/investigations/${encodeURIComponent(id)}/decision`, { method: "POST", json: body }); } catch { return mockSubmitDecision(id, body); }
}

export async function uploadCsv(file: File, onUpdate: (job: CsvUploadJob) => void, sourceId = "auto"): Promise<CsvUploadJob> {
  try {
    const form = new FormData();
    form.append("file", file);
    onUpdate({ id: "uploading", fileName: file.name, sizeBytes: file.size, status: "processing", createdAt: new Date().toISOString() });
    return await request<CsvUploadJob>(`/api/uploads?source_id=${encodeURIComponent(sourceId)}`, { method: "POST", body: form });
  } catch {
    return mockUploadCsv(file.name, file.size, onUpdate);
  }
}
