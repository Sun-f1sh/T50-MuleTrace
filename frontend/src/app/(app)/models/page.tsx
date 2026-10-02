"use client";
import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { anchorModelVersion, getModelMetrics, verifyModelVersion } from "@/lib/api";
import type { ModelVersion } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { Activity, Fingerprint, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

function Metric({label,value}:{label:string;value:unknown}){return <div className="rounded-lg border border-line bg-subtle p-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</p><p className="mt-1 text-lg font-semibold text-ink">{typeof value==="number"?value.toFixed(3):"—"}</p></div>}
function VersionCard({initial,blockchainConfigured}:{initial:ModelVersion;blockchainConfigured:boolean}){
 const [version,setVersion]=useState(initial);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 const run=async(action:"anchor"|"verify")=>{setBusy(true);setError(null);try{setVersion(action==="anchor"?await anchorModelVersion(version.versionId):await verifyModelVersion(version.versionId));}catch(e){setError(e instanceof Error?e.message:"Model version action failed");}finally{setBusy(false)}};
 const state=version.verificationStatus;const label=state==="verified"?"On-chain confirmed":state==="pending"?"Pending confirmation":state==="failed"?"Not verified":"Not anchored";
 return <article className="rounded-lg border border-line bg-canvas p-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{version.model}</p><p className="mt-1 font-mono text-[10px] text-faint">{version.versionId} · import {version.batchId}</p><p className="mt-2 break-all font-mono text-[10px] text-muted" title={version.sha256}>SHA-256 {version.sha256}</p></div>
   <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${state==="verified"?"bg-positive-soft text-positive":state==="pending"?"bg-warn-soft text-warn":"bg-subtle text-muted"}`}>{state==="verified"?<ShieldCheck className="h-3 w-3"/>:<Fingerprint className="h-3 w-3"/>}{label}</span>
  </div>
  <p className="mt-2 text-[11px] leading-relaxed text-faint">Manifest SHA-256 commits to source provenance, configuration and {version.artifactStatus === "persisted" ? "the separate private estimator artifact hash" : `artifact status: ${version.artifactStatus}`}. The artifact stays off-chain; no source rows or model data are published.</p>{version.artifactSha256&&<p className="mt-1 break-all font-mono text-[10px] text-faint">Off-chain model artifact SHA-256 {version.artifactSha256}</p>}
  {version.transactionHash&&<p className="mt-2 break-all font-mono text-[10px] text-faint">Tx {version.transactionHash}{version.blockNumber?` · chain ${version.chainId} · block ${version.blockNumber}`:""}</p>}
  <div className="mt-3 flex flex-wrap items-center gap-2">
   {!version.transactionHash&&<button onClick={()=>run("anchor")} disabled={busy||!blockchainConfigured} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50">{busy?<Loader2 className="inline h-3 w-3 animate-spin"/>:"Anchor model hash"}</button>}
   {version.transactionHash&&<button onClick={()=>run("verify")} disabled={busy} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink hover:bg-subtle disabled:opacity-50">{busy?<Loader2 className="inline h-3 w-3 animate-spin"/>:"Re-verify transaction"}</button>}
   {!blockchainConfigured&&<span className="text-[11px] text-faint">EVM RPC, contract and signer are not configured.</span>}
  </div>
  {error&&<p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
 </article>
}
export default function ModelsPage(){
 const {data,loading,error,reload}=useAsync(()=>getModelMetrics(),[]);
 return <><PageHeader title="Model analytics" description="Held-out performance from imported, explicitly labeled rows, with immutable training-run version commitments. Unlabeled sources are not presented as ground-truth evaluations."/>
 {loading?<Skeleton className="h-56 rounded-xl"/>:error?<ErrorState message={error} onRetry={reload}/>:!data||data.evaluations.length===0?<EmptyState title="No evaluation data yet" description="Import a dataset to create its auditable scoring-run version. Both fraud classes and enough labeled rows are required before supervised metrics are reported."/>:<>
  <section className="mb-4 rounded-xl border border-line bg-surface p-5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-positive"/><h2 className="font-semibold text-ink">{data.model}</h2></div><p className="mt-2 text-sm text-muted">{data.evaluationMethod}</p></section>
  <div className="space-y-4">{data.evaluations.map(ev=>{const cm=ev.confusionMatrix as Record<string,number>|null;return <section key={ev.batchId} className="rounded-xl border border-line bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">{ev.filename}</h2><p className="mt-1 font-mono text-[10px] text-faint">{String(ev.sourceId)} · {formatDateTime(String(ev.createdAt))} · {String(ev.method??"No cross-validation")}</p></div><span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase ${ev.status==="evaluated"?"bg-positive-soft text-positive":"bg-subtle text-muted"}`}>{String(ev.status).replaceAll("_"," ")}</span></div>
   {ev.status==="evaluated"?<><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"><Metric label="Precision" value={ev.precision}/><Metric label="Recall" value={ev.recall}/><Metric label="F1" value={ev.f1}/><Metric label="PR-AUC" value={ev.prAuc}/><Metric label="ROC-AUC" value={ev.rocAuc}/></div><div className="mt-4 rounded-lg border border-line px-4 py-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Confusion matrix</p><p className="mt-2 text-xs text-muted">TN {formatNumber(cm?.tn??0)} · FP {formatNumber(cm?.fp??0)} · FN {formatNumber(cm?.fn??0)} · TP {formatNumber(cm?.tp??0)}</p></div></>:<p className="mt-4 flex items-start gap-2 rounded-lg bg-subtle p-3 text-sm text-muted"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/>{String(ev.reason??"Metrics are unavailable for this import.")}</p>}
   <p className="mt-3 text-xs text-faint">{formatNumber(Number(ev.labeledRows??0))} labeled rows · {formatNumber(Number(ev.fraudLabels??0))} positive labels · evaluation does not represent adjudicated case outcomes.</p>
  </section>})}</div>
  <section className="mt-6 rounded-xl border border-line bg-surface p-5"><div className="flex items-start gap-3"><Fingerprint className="mt-0.5 h-4 w-4 text-positive"/><div><h2 className="text-sm font-semibold text-ink">Versioned model runs</h2><p className="mt-1 text-xs text-muted">SHA-256 manifests pin the model configuration, library versions, feature schema and source-file commitment. Anchoring requires an admin token and configured EVM credentials.</p></div></div>
   {data.versions.length===0?<p className="mt-4 text-sm text-faint">No model versions are recorded for these imports.</p>:<div className="mt-4 space-y-3">{data.versions.map(v=><VersionCard key={v.versionId} initial={v} blockchainConfigured={data.blockchainConfigured}/>)}</div>}
  </section>
 </>}
 </>;
}
