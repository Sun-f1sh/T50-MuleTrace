"use client";
import { useAsync } from "@/hooks/useAsync";
import { getDatasets } from "@/lib/api";
import { ImportCsv } from "@/components/dashboard/ImportCsv";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { formatDateTime, formatNumber, truncateMiddle } from "@/lib/utils/format";
import { Database, ExternalLink, FileCheck2 } from "lucide-react";

export default function DatasetsPage() {
  const { data, loading, error, reload } = useAsync(() => getDatasets(), []);
  return <>
    <PageHeader title="Dataset manager" description="Independent source profiles, schema mapping, deduplication, labels and provenance. Upload the relevant CSV obtained from each publisher." />
    {loading ? <div className="grid gap-4 lg:grid-cols-2">{[0,1,2].map(i=><Skeleton key={i} className="h-56 rounded-xl" />)}</div> : error ? <ErrorState message={error} onRetry={reload}/> :
      <div className="grid gap-4 lg:grid-cols-2">{(data??[]).map(ds=><section key={ds.id} className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-celery-wash p-2"><Database className="h-4 w-4 text-ink"/></span><div className="min-w-0 flex-1"><h2 className="text-base font-semibold text-ink">{ds.name}</h2><a className="mt-1 inline-flex items-center gap-1 text-xs text-muted underline decoration-line underline-offset-2 hover:text-ink" href={ds.url} target="_blank" rel="noreferrer">Kaggle source <ExternalLink className="h-3 w-3"/></a></div></div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{ds.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2"><ImportCsv sourceId={ds.id} datasetName={ds.name} onImported={reload}/><span className="font-mono text-[10px] text-faint">{ds.imports.length} import{ds.imports.length===1?"":"s"}</span></div>
        {ds.imports.length>0&&<div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Recent imports</h3><div className="space-y-2">{ds.imports.slice(0,3).map(batch=><div key={batch.id} className="rounded-lg border border-line p-3"><div className="flex items-center gap-2 text-xs"><FileCheck2 className="h-3.5 w-3.5 shrink-0 text-positive"/><span className="min-w-0 flex-1 truncate text-ink">{batch.filename}</span><span className="font-mono text-faint">{formatNumber(batch.rowsProcessed)} rows</span><span className="hidden text-faint sm:inline">{formatDateTime(batch.createdAt)}</span></div><p className="mt-2 break-all font-mono text-[10px] text-faint" title={batch.provenance.sha256}>SHA-256 {truncateMiddle(batch.provenance.sha256,16,10)}</p><p className="mt-1 text-[10px] text-faint">{batch.provenance.schemaHeaders.length} source headers · uploaded by {batch.provenance.uploadedBy}</p></div>)}</div></div>}
      </section>)}</div>}
  </>;
}
