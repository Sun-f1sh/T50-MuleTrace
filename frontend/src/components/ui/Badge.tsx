import { cn } from "@/lib/utils/cn";

type BadgeTone = "neutral" | "celery" | "mint" | "danger" | "warn" | "positive" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line text-muted",
  celery: "border-transparent bg-celery-wash text-ink",
  mint: "border-transparent bg-mint-wash text-positive dark:text-mint",
  danger: "border-transparent bg-danger-soft text-danger",
  warn: "border-transparent bg-warn-soft text-warn",
  positive: "border-transparent bg-positive-soft text-positive",
  info: "border-transparent bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold tracking-[0.01em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
