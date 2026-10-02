"use client";

import { useMemo, useState } from "react";
import type { AlertFilter } from "@/components/alerts/AlertFilters";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertQueue } from "@/components/dashboard/AlertQueue";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAsync } from "@/hooks/useAsync";
import { getAlerts } from "@/lib/api";

export default function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useAsync(() => getAlerts(), []);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      new: all.filter((a) => a.status === "new").length,
      "in-review": all.filter((a) => a.status === "in-review").length,
      resolved: all.filter((a) => a.status === "resolved").length,
    } satisfies Partial<Record<AlertFilter, number>>;
  }, [data]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((a) => a.accountId.includes(q));
    return list;
  }, [data, filter, query]);

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Suspicious accounts raised by the detection engine, ordered by risk."
      />
      <AlertFilters
        value={filter}
        onChange={setFilter}
        query={query}
        onQuery={setQuery}
        counts={counts}
      />
      <div className="mt-5">
        <AlertQueue
          title={filter === "all" ? "All alerts" : `${filter === "in-review" ? "In review" : filter[0].toUpperCase() + filter.slice(1)} alerts`}
          alerts={filtered}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      </div>
    </>
  );
}
