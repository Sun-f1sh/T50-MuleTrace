import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "./Reveal";

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1200px] px-6 py-28 lg:px-10 lg:py-36">
        <Reveal>
          <h2 className="max-w-[10ch] text-[clamp(3rem,8vw,7rem)] font-semibold display-tight text-ink">
            START
            <br />
            TRACING<span className="text-mint">.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link href="/dashboard">
              <Button size="lg">
                Start Investigation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
              CSV → Detection → Risk → Network → Decision → Audit
            </span>
          </div>
        </Reveal>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
          <Logo />
          <span className="font-mono text-[11px] text-faint">© 2026 MuleTrace — Fraud investigation platform</span>
        </div>
      </div>
    </footer>
  );
}
