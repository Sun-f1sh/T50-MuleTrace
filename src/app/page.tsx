import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ProblemSection } from "@/components/landing/sections/Problem";
import { TraceSection } from "@/components/landing/sections/Trace";
import { DetectSection } from "@/components/landing/sections/Detect";
import { UnderstandSection } from "@/components/landing/sections/Understand";
import { InvestigateSection } from "@/components/landing/sections/Investigate";
import { DecideSection } from "@/components/landing/sections/Decide";
import { AuditSection } from "@/components/landing/sections/AuditSection";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <LandingNav />
      <Hero />
      <ProblemSection />
      <TraceSection />
      <DetectSection />
      <UnderstandSection />
      <InvestigateSection />
      <DecideSection />
      <AuditSection />
      <LandingFooter />
    </main>
  );
}
