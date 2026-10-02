import { cn } from "@/lib/utils/cn";
import { riskTone, type ToneName } from "@/lib/utils/risk";
import type { RiskLevel } from "@shared/types";

const toneClasses: Record<ToneName, string> = {
  danger: "bg-danger",
  warn: "bg-warn",
  positive: "bg-positive",
  info: "bg-info",
};

export function StatusDot({
  tone,
  className,
  pulse,
}: {
  tone: ToneName;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex h-2 w-2 shrink-0", className)}>
      <span className={cn("h-2 w-2 rounded-full", toneClasses[tone])} />
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-60",
            toneClasses[tone],
          )}
        />
      )}
    </span>
  );
}

export function RiskDot({ level, className }: { level: RiskLevel; className?: string }) {
  return <StatusDot tone={riskTone(level)} className={className} />;
}

const riskTextClasses: Record<ToneName, string> = {
  danger: "text-danger",
  warn: "text-warn",
  positive: "text-positive",
  info: "text-info",
};

export function RiskLabel({ level, score }: { level: RiskLevel; score?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <RiskDot level={level} />
      <span className={cn("font-semibold", riskTextClasses[riskTone(level)])}>
        {score !== undefined ? `${score} · ` : ""}
        {level === "critical" ? "Critical" : `${level.charAt(0).toUpperCase()}${level.slice(1)} risk`}
      </span>
    </span>
  );
}
