"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { truncateMiddle } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function CopyField({
  value,
  display,
  className,
}: {
  value: string;
  display?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={value}
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-subtle px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      <span className="truncate">{display ?? truncateMiddle(value)}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-positive" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
