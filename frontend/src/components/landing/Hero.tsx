"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HeroComposition } from "./HeroComposition";

const META = ["CSV ingestion", "Pattern detection", "Risk scoring", "Audit anchoring"];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Subtle parallax: the composition drifts slower than the page.
  const compY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const compOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.35]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 lg:pt-44">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="font-mono text-xs uppercase tracking-[0.24em] text-faint"
        >
          Fraud investigation platform
        </motion.p>

        <motion.h1
          style={{ y: headlineY }}
          className="mt-6 max-w-[12ch] text-[clamp(3.4rem,9.5vw,8.25rem)] font-semibold display-tight text-ink"
        >
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            TRACE THE
          </motion.span>
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            MONEY<span className="text-mint">.</span>
          </motion.span>
        </motion.h1>

        <div className="mt-10 flex flex-col gap-8 pb-20 md:flex-row md:items-end md:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="max-w-md text-lg leading-relaxed text-muted"
          >
            MuleTrace turns transaction data into an investigation you can
            understand — patterns, risk, network, timeline, and a decision you
            can defend.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link href="/dashboard">
              <Button size="lg">
                Start Investigation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#workflow">
              <Button size="lg" variant="secondary">
                See the workflow
              </Button>
            </a>
          </motion.div>
        </div>
      </div>

      <motion.div style={{ y: compY, opacity: compOpacity }} className="relative pb-24">
        <HeroComposition />
      </motion.div>

      <div className="border-y border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-10 gap-y-2 px-6 py-4 lg:px-10">
          {META.map((item) => (
            <span
              key={item}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
