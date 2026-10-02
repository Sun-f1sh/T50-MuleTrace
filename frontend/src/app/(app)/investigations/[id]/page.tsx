"use client";

import { use } from "react";
import { InvestigationView } from "@/components/investigation/InvestigationView";

export default function InvestigationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InvestigationView id={id} />;
}
