"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import type { CsvUploadJob } from "@shared/types";
import { uploadCsv } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Phase = "idle" | "uploading" | "completed" | "error";

export function ImportCsv({ onImported, sourceId = "auto", datasetName }: { onImported?: () => void; sourceId?: string; datasetName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<CsvUploadJob | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState(sourceId);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase("idle");
    setJob(null);
    setFileName("");
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const startUpload = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Only CSV files are supported. Export your transaction data as .csv and retry.");
        setPhase("error");
        return;
      }
      setFileName(file.name);
      setError(null);
      setPhase("uploading");
      uploadCsv(file, (updated) => setJob({ ...updated }), selectedSource)
        .then((final) => {
          setJob(final);
          setPhase("completed");
          onImported?.();
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Upload failed. Please retry.");
          setPhase("error");
        });
    },
    [onImported, router, selectedSource],
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        <UploadCloud className="h-4 w-4" />
        Import CSV
      </Button>
    );
  }

  const progress =
    job && job.rowsTotal
      ? Math.min(100, Math.round(((job.rowsProcessed ?? 0) / job.rowsTotal) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-aurora/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Import transactions</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="text-faint transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6">
          {phase === "idle" && (
            <>
            {!datasetName && <label className="mb-4 block text-xs text-muted">Dataset profile<select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-subtle px-3 py-2 text-sm text-ink"><option value="auto">Auto-detect from headers</option><option value="paysim">Financial Fraud Detection (PaySim)</option><option value="thuandao">Bank Transactions (Thuandao)</option><option value="yogeshtekawade">Banking & Customer Transactions (Yogesh)</option></select></label>}
            {datasetName && <p className="mb-3 text-xs text-muted">Source mapping: <span className="font-medium text-ink">{datasetName}</span></p>}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) startUpload(file);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
                dragging ? "border-mint bg-mint-wash" : "border-line-strong hover:bg-subtle",
              )}
            >
              <UploadCloud className="h-6 w-6 text-muted" />
              <p className="mt-3 text-sm font-medium text-ink">Drop a transaction CSV here</p>
              <p className="mt-1 text-xs text-muted">or click to browse — the backend detects and scores it</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) startUpload(file);
                }}
              />
            </label>
            </>
          )}

          {phase === "uploading" && (
            <div className="py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
                <p className="truncate text-sm font-medium text-ink">{fileName}</p>
              </div>
              <p className="mt-2 font-mono text-xs text-faint">
                {job?.status === "processing"
                  ? "Uploading and analyzing transaction rows…"
                  : "Analyzing uploaded rows…"}
              </p>
              <div className="mt-4 h-1 w-full rounded-full bg-line">
                <div
                  className="h-1 rounded-full bg-mint transition-[width] duration-300"
                  style={{ width: `${job?.status === "queued" ? 4 : progress}%` }}
                />
              </div>
            </div>
          )}

          {phase === "completed" && job && (
            <div className="py-2 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-positive" />
              <p className="mt-3 text-sm font-semibold text-ink">Processing complete</p>
              <p className="mt-1 font-mono text-xs text-muted tnum">
                {formatNumber(job.rowsTotal ?? 0)} rows · {job.alertsCreated ?? 0} alerts ·{" "}
                {job.investigationsCreated ?? 0} investigations
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    close();
                    router.push("/alerts");
                  }}
                >
                  Review alerts
                </Button>
                <Button size="sm" variant="secondary" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="py-2 text-center">
              <TriangleAlert className="mx-auto h-8 w-8 text-danger" />
              <p className="mt-3 text-sm font-semibold text-ink">Import failed</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button size="sm" variant="secondary" onClick={reset}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Choose another file
                </Button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-line px-6 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            CSV → schema mapping → scoring → human review
          </p>
        </footer>
      </div>
    </div>
  );
}
