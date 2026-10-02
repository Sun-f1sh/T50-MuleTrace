import type { Alert, AuditRecord, CsvUploadJob, DashboardSummary, DecisionRequest, DecisionResponse, Investigation, InvestigationSummary } from "@shared/types";
import { API_MODE, request } from "./client";
export { API_MODE, API_BASE_URL } from "./client";
export interface DatasetImport { id:string; filename:string; createdAt:string; rowsTotal:number; rowsProcessed:number; duplicates:number; invalid:number; labelColumn:string|null; labeledRows:number; fraudLabels:number; metrics:Record<string,unknown>|null; provenance:{sourceUrl:string;uploadedBy:string;sha256:string;schemaHeaders:string[]} }
export interface DatasetProfile { id:string; name:string; url:string; description:string; imports:DatasetImport[] }
export interface ModelVersion {versionId:string;batchId:string;sha256:string;model:string;artifactSha256:string|null;artifactStatus:string;transactionHash:string;chainId:string;blockNumber:number;verificationStatus:"not_anchored"|"pending"|"verified"|"failed";verifiedAt:string|null;onChainVerified?:boolean;verified?:boolean}
export interface ModelMetrics {model:string;evaluationMethod:string;evaluations:Array<Record<string,unknown>&{batchId:string;sourceId:string;filename:string;status:string;rocAuc:number|null}>;versions:ModelVersion[];blockchainConfigured:boolean}
export interface BlockchainStatus { configured:boolean; chainId:string|null; contractAddress:string|null; mode:string; warning:string|null }
export interface CrossSourceIntelligence { candidateCount:number; method:string; limitation:string; candidateMatches:Array<{fingerprint:string;sourceProfiles:string[];sourceDatasetNames:string[];occurrences:number;flaggedVolume:number;highestRiskScore:number;currency:string;interpretation:string}> }
export function getDashboardSummary():Promise<DashboardSummary>{return request("/api/dashboard/summary")}
export function getAlerts():Promise<Alert[]>{return request("/api/alerts")}
export function getInvestigations():Promise<InvestigationSummary[]>{return request("/api/investigations")}
export function getInvestigation(id:string):Promise<Investigation>{return request(`/api/investigations/${encodeURIComponent(id)}`)}
export function getAuditRecords():Promise<AuditRecord[]>{return request("/api/audit")}
export function getDatasets():Promise<DatasetProfile[]>{return request("/api/datasets")}
export function getModelMetrics():Promise<ModelMetrics>{return request("/api/model/metrics")}
export function anchorModelVersion(id:string):Promise<ModelVersion>{return request(`/api/model/versions/${encodeURIComponent(id)}/anchor`,{method:"POST",json:{}})}
export function verifyModelVersion(id:string):Promise<ModelVersion>{return request(`/api/model/versions/${encodeURIComponent(id)}/verify`)}
export function getCrossSourceIntelligence():Promise<CrossSourceIntelligence>{return request("/api/intelligence/cross-source")}
export function getBlockchainStatus():Promise<BlockchainStatus>{return request("/api/blockchain/status")}
export function verifyAudit(id:string):Promise<AuditRecord&{offchainHashMatches:boolean;onChainVerified:boolean;verified:boolean}>{return request(`/api/audit/${encodeURIComponent(id)}/verify`)}
export function submitDecision(id:string,body:DecisionRequest):Promise<DecisionResponse>{return request(`/api/investigations/${encodeURIComponent(id)}/decision`,{method:"POST",json:body})}
export function uploadCsv(file:File,onUpdate:(job:CsvUploadJob)=>void,sourceId="auto"):Promise<CsvUploadJob>{
 const form=new FormData(); form.append("file",file);
 onUpdate({id:"uploading",fileName:file.name,sizeBytes:file.size,status:"processing",createdAt:new Date().toISOString()});
 return request<CsvUploadJob>(`/api/uploads?source_id=${encodeURIComponent(sourceId)}`,{method:"POST",body:form});
}
