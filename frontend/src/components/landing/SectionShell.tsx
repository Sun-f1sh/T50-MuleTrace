import { Reveal } from "./Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils/cn";

export function SectionShell({
  id,
  index,
  label,
  children,
  className,
}: {
  id?: string;
  index: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-line", className)}>
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-36">
        <Reveal>
          <SectionLabel index={index} label={label} />
        </Reveal>
        {children}
      </div>
    </section>
  );
}
