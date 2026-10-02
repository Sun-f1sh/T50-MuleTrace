"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import type { DecisionResponse, Investigation } from "@shared/types";
import { submitDecision } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function DecisionPanel({
  investigation,
  onDecided,
}: {
  investigation: Investigation;
  onDecided: (result: DecisionResponse) => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"confirmed" | "cleared" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "confirmed" | "cleared") => {
    setSubmitting(decision);
    setError(null);
    try {
      const result = await submitDecision(investigation.id, {
        decision,
        note: note.trim() || undefined,
      });
      onDecided(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not record the decision. Please retry.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-6 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Analyst decision</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          The human decision is append-only. Its evidence hash is anchored on-chain only when EVM verification is available.
        </p>
      </header>

      <div className="px-6 py-5">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note for the audit record…"
          className="w-full resize-none rounded-lg border border-line bg-subtle px-3.5 py-2.5 text-[13px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button
            variant="danger-solid"
            size="lg"
            disabled={submitting !== null}
            onClick={() => decide("confirmed")}
            className={cn(submitting === "confirmed" && "opacity-70")}
          >
            {submitting === "confirmed" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "Confirm Suspicious"
            )}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            disabled={submitting !== null}
            onClick={() => decide("cleared")}
            className="border-positive/50 text-positive hover:bg-positive-soft"
          >
            {submitting === "cleared" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              "Clear"
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3">
            <p className="text-[13px] font-medium text-danger">{error}</p>
            <p className="mt-0.5 text-xs text-muted">
              Nothing was recorded — the investigation remains open.
            </p>
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          <Lock className="h-3 w-3" />
          Decisions are append-only and tamper-evident
        </p>
      </div>
    </section>
  );
}
