import { cn } from "@/lib/utils/cn";

/** Editorial eyebrow: mono index + rule + uppercase label. */
export function SectionLabel({
  index,
  label,
  className,
}: {
  index?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {index && <span className="font-mono text-xs text-faint">{index}</span>}
      <span className="h-px w-10 bg-line-strong" />
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
        {label}
      </span>
    </div>
  );
}
