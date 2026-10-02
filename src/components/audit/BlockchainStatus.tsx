"use client";
import { useAsync } from "@/hooks/useAsync";
import { getBlockchainStatus } from "@/lib/api";
import { Skeleton } from "@/components/ui/states";
import { Blocks, CircleCheck, CircleOff } from "lucide-react";
export function BlockchainStatus(){
 const {data,loading,error}=useAsync(()=>getBlockchainStatus(),[]);
 return <section className="mb-5 rounded-xl border border-line bg-surface p-5"><div className="flex items-start gap-3"><span className="rounded-lg bg-subtle p-2">{data?.configured?<Blocks className="h-4 w-4 text-positive"/>:<CircleOff className="h-4 w-4 text-faint"/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-ink">EVM audit anchoring</h2>{data?.configured&&<span className="rounded-full bg-positive-soft px-2 py-0.5 font-mono text-[10px] text-positive">Configured</span>}</div>{loading?<Skeleton className="mt-2 h-4 w-48"/>:<p className="mt-1 text-xs leading-relaxed text-muted">{error??data?.warning??data?.mode}</p>}{data?.configured&&<p className="mt-2 break-all font-mono text-[10px] text-faint">Chain {data.chainId} · {data.contractAddress}</p>}</div></div><p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-faint"><CircleCheck className="h-3.5 w-3.5"/>Only a mined transaction plus successful on-chain digest read is marked verified.</p></section>
}
