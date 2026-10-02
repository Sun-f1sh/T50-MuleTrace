import type { RiskLevel } from "@shared/types";

export type ToneName = "danger" | "warn" | "positive" | "info";

/** Maps a risk level to the semantic tone used for dots, labels and bars. */
export function riskTone(level: RiskLevel): ToneName {
  switch (level) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
      return "positive";
  }
}

export function riskBand(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}
