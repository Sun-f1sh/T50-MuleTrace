"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type AlertFilter = "all" | "new" | "in-review" | "resolved";

const FILTERS: { value: AlertFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in-review", label: "In review" },
  { value: "resolved", label: "Resolved" },
];

export function AlertFilters({
  value,
  onChange,
  query,
  onQuery,
  counts,
}: {
  value: AlertFilter;
  onChange: (f: AlertFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  counts?: Partial<Record<AlertFilter, number>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-full border border-line p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              value === f.value
                ? "bg-celery-wash text-ink"
                : "text-muted hover:text-ink",
            )}
          >
            {f.label}
            {counts?.[f.value] !== undefined && (
              <span className="ml-1.5 font-mono text-[11px] text-faint tnum">
                {counts[f.value]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="relative ml-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search account"
          className="h-9 w-52 rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
        />
      </div>
    </div>
  );
}
