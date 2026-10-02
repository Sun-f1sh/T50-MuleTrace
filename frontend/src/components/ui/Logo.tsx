import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-baseline gap-1 font-semibold tracking-[-0.03em]", className)}
    >
      <span className="text-[17px]">MuleTrace</span>
      {!compact && <span className="h-1.5 w-1.5 rounded-full bg-mint" />}
    </Link>
  );
}
